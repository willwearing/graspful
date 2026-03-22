import { Command } from 'commander';
import * as readline from 'readline';
import { saveCredentials, getBaseUrl } from '../lib/auth';
import { output, outputError } from '../lib/output';

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function registerLoginCommand(program: Command) {
  program
    .command('login')
    .description('Authenticate with a Graspful instance')
    .option('--api-url <url>', 'API base URL')
    .option('--token <token>', 'API key or JWT token (skip interactive prompt)')
    .action(async (opts: { apiUrl?: string; token?: string }) => {
      const baseUrl = opts.apiUrl || getBaseUrl();

      let token = opts.token;
      if (!token) {
        if (!process.stdin.isTTY) {
          // Read from piped stdin
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk as Buffer);
          }
          token = Buffer.concat(chunks).toString('utf-8').trim();
        } else {
          console.log(`Authenticating with ${baseUrl}`);
          console.log('Enter your API key or JWT token:');
          token = await prompt('> ');
        }
      }

      if (!token) {
        outputError('No token provided');
        process.exit(1);
      }

      saveCredentials(token, baseUrl);

      output(
        { authenticated: true, baseUrl },
        `Authenticated. Credentials saved for ${baseUrl}`,
      );
    });
}
