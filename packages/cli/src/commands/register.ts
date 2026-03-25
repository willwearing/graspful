import { Command } from 'commander';
import { saveApiKeyCredentials, getBaseUrl } from '../lib/auth';
import { output, outputError } from '../lib/output';

interface RegisterResponse {
  userId: string;
  orgSlug: string;
  apiKey: string;
}

export function registerRegisterCommand(program: Command) {
  program
    .command('register')
    .description('Create a new Graspful account and organization')
    .requiredOption('--email <email>', 'Email address')
    .requiredOption('--password <password>', 'Password')
    .option('--api-url <url>', 'API base URL')
    .action(async (opts: { email: string; password: string; apiUrl?: string }) => {
      const baseUrl = (opts.apiUrl || getBaseUrl()).replace(/\/$/, '');

      try {
        const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: opts.email, password: opts.password }),
        });

        if (!res.ok) {
          const body = await res.text();
          let message = `Registration failed (${res.status})`;
          try {
            const parsed = JSON.parse(body);
            if (parsed.message) message = parsed.message;
          } catch {
            if (body) message = body;
          }
          outputError(message);
          process.exit(1);
        }

        const data = (await res.json()) as RegisterResponse;

        saveApiKeyCredentials(data.apiKey, baseUrl);

        output(
          { userId: data.userId, orgSlug: data.orgSlug, apiKey: data.apiKey, baseUrl },
          [
            `Created org: ${data.orgSlug}`,
            `API key: ${data.apiKey} (saved to ~/.graspful/credentials.json)`,
            '',
            `You're ready. Run: graspful import course.yaml --org ${data.orgSlug}`,
          ].join('\n'),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(`Registration failed: ${msg}`);
        process.exit(1);
      }
    });
}
