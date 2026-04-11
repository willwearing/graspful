import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { requireAuth } from '../lib/auth';
import { ApiClient } from '../lib/api-client';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';
import { detectFileType } from '@graspful/shared';

type FileType = 'course' | 'brand' | 'academy';

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

      const content = fs.readFileSync(file, 'utf-8');
      let raw: unknown;
      try {
        raw = yaml.load(content);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(`YAML parse error: ${msg}`);
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
          const result = await api.post<{ courseId: string; url: string; published: boolean; reviewFailures?: string[] }>(
            `/api/v1/orgs/${orgSlug}/courses/import`,
            { yaml: content, publish: opts.publish, replace: opts.replace, archiveMissing: opts.archiveMissing },
          );

          cliCapture('course imported', { course_id: result.courseId, org: orgSlug, published: result.published });
          if (opts.publish && result.reviewFailures && result.reviewFailures.length > 0) {
            output(
              { ...result, status: 'imported_but_not_published' },
              `Imported course ${result.courseId} but publish failed:\n${result.reviewFailures.map((f) => `  - ${f}`).join('\n')}`,
            );
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

          const result = await api.post<{
            academyId: string;
            academySlug: string;
            partCount: number;
            courseCount: number;
            courseResults: Array<{ courseId: string }>;
            warnings: string[];
          }>(`/api/v1/orgs/${orgSlug}/academies/import`, {
            manifestYaml: content,
            courseYamls,
            replace: opts.replace,
            archiveMissing: opts.archiveMissing,
          });

          const publishedCourseIds: string[] = [];
          const publishFailures: string[] = [];

          if (opts.publish) {
            for (const courseResult of result.courseResults) {
              try {
                await api.post(`/api/v1/orgs/${orgSlug}/courses/${courseResult.courseId}/publish`, {});
                publishedCourseIds.push(courseResult.courseId);
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                publishFailures.push(`${courseResult.courseId}: ${msg}`);
              }
            }
          }

          const response = {
            ...result,
            publishedCourseIds,
            publishFailures,
          };

          cliCapture('academy imported', {
            academy_id: result.academyId,
            org: orgSlug,
            course_count: result.courseCount,
            published_count: publishedCourseIds.length,
          });

          if (publishFailures.length > 0) {
            output(
              response,
              `Imported academy ${result.academySlug} (${result.courseCount} courses) but some courses failed to publish:\n${publishFailures.map((failure) => `  - ${failure}`).join('\n')}`,
            );
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
        // Brand import — unwrap YAML structure to flat DTO
        try {
          const parsed = raw as Record<string, unknown>;
          const brandSection = (parsed.brand || {}) as Record<string, unknown>;
          const dto = {
            slug: brandSection.id || brandSection.slug,
            name: brandSection.name,
            domain: brandSection.domain,
            tagline: brandSection.tagline || '',
            logoUrl: (brandSection.logoUrl as string) || '/icon.svg',
            orgSlug: brandSection.orgSlug,
            theme: parsed.theme || {},
            landing: parsed.landing || {},
            seo: parsed.seo || {},
            pricing: parsed.pricing || {},
          };
          const result = await api.post<{
            brand: { slug: string; domain: string };
            domain: {
              verified: boolean;
              error?: string;
              dnsInstructions?: { type: string; name: string; value: string };
            };
          }>('/api/v1/brands', dto);

          const slug = result.brand?.slug || dto.slug;
          const domain = result.brand?.domain || dto.domain;
          const verified = result.domain?.verified ?? false;
          const dns = result.domain?.dnsInstructions;

          let msg = `Imported brand: ${slug}\n  Domain: ${domain} (${verified ? 'verified' : 'not yet verified'})`;
          if (dns) {
            msg += `\n\n  Configure DNS:\n    ${dns.type}  ${dns.name}  →  ${dns.value}`;
          }
          if (!verified) {
            msg += `\n\n  Check status later: graspful domain-status ${slug}`;
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
