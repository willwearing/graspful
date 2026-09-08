import { Command } from 'commander';
import { requireAuth } from '../lib/auth';
import { ApiClient } from '../lib/api-client';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';
import { publicationFailures, type CoursePublicationResponse } from '@graspful/shared';

export function registerPublishCommand(program: Command) {
  program
    .command('publish <courseId>')
    .description('Publish a course after it passes the review gate')
    .requiredOption('--org <slug>', 'Organization slug')
    .action(async (courseId: string, opts: { org: string }) => {
      const creds = requireAuth();
      const api = new ApiClient(creds);

      try {
        const result = await api.post<CoursePublicationResponse>(
          `/api/v1/orgs/${opts.org}/courses/${courseId}/publish`,
          {},
        );

        if (result.published !== true) {
          const failures = publicationFailures(result);
          outputError(
            `Publish failed for course ${result.courseId}:\n${failures.map((failure) => `  - ${failure}`).join('\n')}`,
            { ...result, status: 'not_published', publicationFailures: failures },
          );
          process.exitCode = 1;
          return;
        }

        cliCapture('course published', { course_id: result.courseId, org: opts.org, published: true });
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
