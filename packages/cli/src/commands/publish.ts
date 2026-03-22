import { Command } from 'commander';
import { requireAuth } from '../lib/auth';
import { ApiClient } from '../lib/api-client';
import { output, outputError } from '../lib/output';

export function registerPublishCommand(program: Command) {
  program
    .command('publish <courseId>')
    .description('Publish a course (sets isPublished = true)')
    .requiredOption('--org <slug>', 'Organization slug')
    .action(async (courseId: string, opts: { org: string }) => {
      const creds = requireAuth();
      const api = new ApiClient(creds);

      try {
        const result = await api.post<{ courseId: string; published: boolean }>(
          `/api/v1/orgs/${opts.org}/courses/${courseId}/publish`,
          {},
        );

        output(
          result,
          `Published course: ${result.courseId}`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(`Publish failed: ${msg}`);
        process.exit(1);
      }
    });
}
