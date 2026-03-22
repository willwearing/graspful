import { Command } from 'commander';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { requireAuth } from '../lib/auth';
import { ApiClient } from '../lib/api-client';
import { output, outputError } from '../lib/output';

type FileType = 'course' | 'brand';

function detectFileType(data: unknown): FileType | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  if ('course' in obj) return 'course';
  if ('brand' in obj) return 'brand';
  return null;
}

export function registerImportCommand(program: Command) {
  program
    .command('import <file>')
    .description('Import a course or brand YAML into a Graspful instance')
    .option('--org <slug>', 'Organization slug')
    .option('--publish', 'Publish immediately (runs review gate)', false)
    .action(async (file: string, opts: { org?: string; publish: boolean }) => {
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
        outputError('Could not detect file type. Expected top-level key: course or brand');
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
            { yaml: content, publish: opts.publish },
          );

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
      } else {
        // Brand import
        try {
          const brandData = raw as Record<string, unknown>;
          const result = await api.post<{ slug: string; domain: string; verificationStatus: string }>(
            '/api/v1/brands',
            brandData,
          );

          output(
            result,
            `Imported brand: ${result.slug}\n  Domain: ${result.domain}\n  Verification: ${result.verificationStatus}`,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          outputError(`Brand import failed: ${msg}`);
          process.exit(1);
        }
      }
    });
}
