import { Command } from 'commander';
import { saveCredentials, saveApiKeyCredentials, getBaseUrl } from '../lib/auth';
import { runBrowserAuthFlow } from '../lib/browser-auth';
import { output, outputError } from '../lib/output';
import { cliCapture } from '../lib/analytics';

export function registerLoginCommand(program: Command) {
  program
    .command('login')
    .description('Authenticate with a Graspful instance')
    .option('--api-url <url>', 'API base URL')
    .option('--token <token>', 'API key or JWT token (skip interactive prompt)')
    .option('--token-stdin', 'Read an API key or JWT from stdin')
    .option('--email <email>', 'Email address (use with --password for non-interactive login)')
    .option('--password <password>', 'Password (use with --email for non-interactive login)')
    .option('--no-browser', 'Print the sign-in URL instead of opening it automatically')
    .action(async (opts: { apiUrl?: string; token?: string; tokenStdin?: boolean; email?: string; password?: string; browser?: boolean }) => {
      const baseUrl = (opts.apiUrl || getBaseUrl()).replace(/\/$/, '');

      try {
        let token = opts.token;
        if (opts.tokenStdin) {
          if (opts.token || opts.email || opts.password) {
            throw new Error('--token-stdin cannot be combined with --token, --email, or --password.');
          }
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
          token = Buffer.concat(chunks).toString('utf-8').trim();
          if (!token) throw new Error('No token received on stdin.');
        }
        if (opts.password && !opts.email) throw new Error('--password requires --email.');
        if (!token && !process.stdin.isTTY && !(opts.email && opts.password) && opts.browser !== false) {
          throw new Error('Non-interactive login requires --token, --token-stdin, --email with --password, or --no-browser.');
        }

        // Email + password login: call the backend auth/login endpoint
        if (!token && opts.email && opts.password) {
          const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: opts.email, password: opts.password }),
          });

          if (!res.ok) {
            const body = await res.text();
            let message = `Login failed (${res.status})`;
            try {
              const parsed = JSON.parse(body);
              if (parsed.message) message = parsed.message;
            } catch {
              // Keep the status message when the server response is not JSON.
            }
            throw new Error(message);
          }

          const { apiKey, orgSlug, userId } = await res.json() as {
            apiKey: string;
            orgSlug: string;
            userId: string;
          };

          saveApiKeyCredentials(apiKey, baseUrl, userId);
          cliCapture('cli logged in', { method: 'email-password' });
          output(
            { authenticated: true, baseUrl, tokenType: 'apiKey', orgSlug, userId },
            `Authenticated. API key saved for ${baseUrl}`,
          );
          return;
        }

        if (!token) {
          const result = await runBrowserAuthFlow({
            apiUrl: baseUrl,
            mode: 'sign-in',
            email: opts.email,
            noBrowser: opts.browser === false,
          });

          cliCapture('cli logged in', { method: 'browser-auth' });
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

        cliCapture('cli logged in', { method: isApiKey ? 'api-key' : 'jwt' });
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
