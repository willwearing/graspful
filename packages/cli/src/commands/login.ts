import { Command } from 'commander';
import { saveCredentials, saveApiKeyCredentials, getBaseUrl } from '../lib/auth';
import { runBrowserAuthFlow } from '../lib/browser-auth';
import { output, outputError } from '../lib/output';

export function registerLoginCommand(program: Command) {
  program
    .command('login')
    .description('Authenticate with a Graspful instance')
    .option('--api-url <url>', 'API base URL')
    .option('--token <token>', 'API key or JWT token (skip interactive prompt)')
    .option('--email <email>', 'Prefill the browser sign-in form')
    .option('--no-browser', 'Print the sign-in URL instead of opening it automatically')
    .action(async (opts: { apiUrl?: string; token?: string; email?: string; browser?: boolean }) => {
      const baseUrl = (opts.apiUrl || getBaseUrl()).replace(/\/$/, '');

      let token = opts.token;
      if (!token) {
        if (!process.stdin.isTTY) {
          // Read from piped stdin
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk as Buffer);
          }
          token = Buffer.concat(chunks).toString('utf-8').trim();
        }
      }

      try {
        if (!token) {
          const result = await runBrowserAuthFlow({
            apiUrl: baseUrl,
            mode: 'sign-in',
            email: opts.email,
            noBrowser: opts.browser === false,
          });

          output(
            {
              authenticated: true,
              baseUrl,
              tokenType: 'apiKey',
              orgSlug: result.orgSlug,
            },
            `Authenticated. API key saved for ${baseUrl}`,
          );
          return;
        }

        const isApiKey = token.startsWith('gsk_');
        if (isApiKey) {
          saveApiKeyCredentials(token, baseUrl);
        } else {
          saveCredentials(token, baseUrl);
        }

        output(
          { authenticated: true, baseUrl, tokenType: isApiKey ? 'apiKey' : 'jwt' },
          `Authenticated${isApiKey ? ' (API key)' : ''}. Credentials saved for ${baseUrl}`,
        );
      } catch (e) {
        outputError(e instanceof Error ? e.message : String(e));
        process.exit(1);
      }
    });
}
