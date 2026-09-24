import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { readYamlFile } from '@graspful/client';
import { requireAuth } from '../lib/auth';
import { ApiClient } from '../lib/api-client';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';
import { detectFileType, publicationFailures } from '@graspful/shared';

export function registerImportCommand(program: Command) {
  program
    .command('import <file>')
    .description('Import a course, academy, or brand YAML into a Graspful instance')
    .option('--org <slug>', 'Organization slug')
    .option('--publish', 'Publish immediately (runs review gate)', false)
    .option('--replace', 'Replace existing course content on re-import', false)
    .option('--archive-missing', 'Archive concepts/KPs removed from the YAML', false)
    .option(
      '--course-dir <dir>',
      'Base directory for academy course files (defaults to the manifest directory)',
    )
    .action(async (file: string, opts: { org?: string; publish: boolean; replace: boolean; archiveMissing: boolean; courseDir?: string }) => {
      if (!fs.existsSync(file)) {
        outputError(`File not found: ${file}`);
        process.exit(1);
      }

      let content: string;
      let raw: unknown;
      try {
        ({ content, raw } = readYamlFile(file));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(msg);
        process.exit(1);
      }

      const fileType = detectFileType(raw);
      if (!fileType) {
        outputError('Could not detect file type. Expected top-level key: course, brand, or academy');
        process.exit(1);
      }

      const creds = requireAuth();
      const api = new ApiClient(creds);

      if (fileType === 'course') {
        const orgSlug = opts.org;
        if (!orgSlug) {
          outputError('--org is required for course imports');
          process.exit(1);
        }

        try {
          const result = await api.importCourse(orgSlug, {
            yaml: content, publish: opts.publish, replace: opts.replace, archiveMissing: opts.archiveMissing,
          });

          cliCapture('course imported', { course_id: result.courseId, org: orgSlug, published: result.published });
          if (opts.publish && result.published !== true) {
            const failures = publicationFailures(result);
            output(
              { ...result, status: 'imported_but_not_published', publicationFailures: failures },
              `Imported course ${result.courseId} but publish failed:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`,
            );
            process.exitCode = 1;
          } else {
            output(
              result,
              `Imported course: ${result.courseId}\n  URL: ${result.url}\n  Published: ${result.published}`,
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          outputError(`Import failed: ${msg}`);
          process.exit(1);
        }
      } else if (fileType === 'academy') {
        const orgSlug = opts.org;
        if (!orgSlug) {
          outputError('--org is required for academy imports');
          process.exit(1);
        }

        try {
          const parsed = raw as Record<string, unknown>;
          const courses = Array.isArray(parsed.courses) ? parsed.courses : [];
          const manifestDir = opts.courseDir
            ? path.resolve(opts.courseDir)
            : path.dirname(path.resolve(file));
          const courseYamls: Record<string, string> = {};

          for (const course of courses) {
            const courseFile = (course as Record<string, unknown>).file;
            if (typeof courseFile !== 'string' || courseFile.length === 0) {
              outputError('Academy manifest contains a course without a valid file path');
              process.exit(1);
            }

            const resolvedPath = path.resolve(manifestDir, courseFile);
            if (!fs.existsSync(resolvedPath)) {
              outputError(`Academy course file not found: ${resolvedPath}`);
              process.exit(1);
            }

            courseYamls[courseFile] = fs.readFileSync(resolvedPath, 'utf-8');
          }

          const response = await api.importAcademy(orgSlug, {
            manifestYaml: content, courseYamls, publish: opts.publish,
            replace: opts.replace, archiveMissing: opts.archiveMissing,
          });
          const { publishedCourseIds, publishFailures } = response;
          const result = response;

          cliCapture('academy imported', {
            academy_id: result.academyId,
            org: orgSlug,
            course_count: result.courseCount,
            published_count: publishedCourseIds.length,
          });

          if (publishFailures.length > 0) {
            output(
              response,
              `Imported academy ${result.academySlug} (${result.courseCount} courses). Published ${publishedCourseIds.length} of ${result.courseResults.length} courses.\nPublication failures:\n${publishFailures.map((failure) => `  - ${failure}`).join('\n')}`,
            );
            process.exitCode = 1;
          } else {
            output(
              response,
              `Imported academy: ${result.academySlug}\n  Academy ID: ${result.academyId}\n  Courses: ${result.courseCount}\n  Published courses: ${publishedCourseIds.length}`,
            );
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          outputError(`Academy import failed: ${msg}`);
          process.exit(1);
        }
      } else {
        try {
          const result = await api.importBrand(raw);
          const { slug, domain } = result.brand;
          const verified = result.domain.verified;
          const dns = result.domain.dnsInstructions;

          let msg = `Imported brand: ${slug}\n  Domain: ${domain} (${verified ? 'verified' : 'not yet verified'})`;
          if (dns) {
            msg += `\n\n  Configure DNS:\n    ${dns.type}  ${dns.name}  →  ${dns.value}`;
          }
          cliCapture('brand imported', { slug: slug, domain: domain });
          output(result, msg);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          outputError(`Brand import failed: ${msg}`);
          process.exit(1);
        }
      }
    });
}
