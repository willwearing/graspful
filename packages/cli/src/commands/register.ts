import { Command } from 'commander';
import { getBaseUrl } from '../lib/auth';
import { runBrowserAuthFlow } from '../lib/browser-auth';
import { output, outputError } from '../lib/output';

export function registerRegisterCommand(program: Command) {
  program
    .command('register')
    .description('Create a new Graspful account with browser-based authentication')
    .option('--email <email>', 'Prefill the browser sign-up form')
    .option('--password <password>', 'Deprecated. Password entry now happens in the browser.')
    .option('--api-url <url>', 'API base URL')
    .option('--no-browser', 'Print the sign-up URL instead of opening it automatically')
    .action(async (opts: { email?: string; password?: string; apiUrl?: string; browser?: boolean }) => {
      const baseUrl = (opts.apiUrl || getBaseUrl()).replace(/\/$/, '');

      try {
        if (opts.password) {
          console.log('`--password` is deprecated. Complete the password and verification steps in your browser.');
        }

        const result = await runBrowserAuthFlow({
          apiUrl: baseUrl,
          mode: 'sign-up',
          email: opts.email,
          noBrowser: opts.browser === false,
        });

        output(
          {
            userId: result.userId,
            orgSlug: result.orgSlug,
            apiKey: result.apiKey,
            baseUrl,
          },
          [
            `Created org: ${result.orgSlug}`,
            `API key: ${result.apiKey} (saved to ~/.graspful/credentials.json)`,
            '',
            `You're ready. Run: graspful import course.yaml --org ${result.orgSlug}`,
          ].join('\n'),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
          outputError(`Could not reach the API at ${baseUrl}. Check your connection or use --api-url.`);
        } else {
          outputError(`Registration failed: ${msg}`);
        }
        process.exit(1);
      }
    });
}
