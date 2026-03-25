import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { saveApiKeyCredentials, getBaseUrl, resolveCredentials } from '../lib/auth';
import { output, outputError } from '../lib/output';

// ─── Editor detection ────────────────────────────────────────────────────────

interface Editor {
  name: string;
  configPath: string;
}

function detectEditors(): Editor[] {
  const home = os.homedir();
  const editors: Editor[] = [];

  // Claude Code
  const claudeConfig = path.join(home, '.claude.json');
  if (fs.existsSync(path.join(home, '.claude'))) {
    editors.push({ name: 'Claude Code', configPath: claudeConfig });
  }

  // Cursor
  const cursorConfig = path.join(process.cwd(), '.cursor', 'mcp.json');
  if (fs.existsSync(path.join(process.cwd(), '.cursor'))) {
    editors.push({ name: 'Cursor', configPath: cursorConfig });
  }

  // VS Code Copilot (agent mode)
  const vscodeConfig = path.join(process.cwd(), '.vscode', 'mcp.json');
  if (fs.existsSync(path.join(process.cwd(), '.vscode'))) {
    editors.push({ name: 'VS Code', configPath: vscodeConfig });
  }

  // Windsurf
  const windsurfConfig = path.join(home, '.windsurf', 'mcp.json');
  if (fs.existsSync(path.join(home, '.windsurf'))) {
    editors.push({ name: 'Windsurf', configPath: windsurfConfig });
  }

  return editors;
}

function writeMcpConfig(configPath: string, apiKey: string): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let existing: Record<string, unknown> = {};
  if (fs.existsSync(configPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // Start fresh if invalid
    }
  }

  const mcpServers = (existing.mcpServers || {}) as Record<string, unknown>;
  mcpServers['graspful'] = {
    command: 'npx',
    args: ['-y', '@graspful/mcp'],
    env: { GRASPFUL_API_KEY: apiKey },
  };
  existing.mcpServers = mcpServers;

  fs.writeFileSync(configPath, JSON.stringify(existing, null, 2) + '\n');
}

// ─── Interactive prompt ──────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── Command ─────────────────────────────────────────────────────────────────

interface RegisterResponse {
  userId: string;
  orgSlug: string;
  apiKey: string;
}

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Set up Graspful: register, save credentials, configure MCP for your editor')
    .option('--email <email>', 'Email address (skip interactive prompt)')
    .option('--password <password>', 'Password (skip interactive prompt)')
    .option('--api-url <url>', 'API base URL')
    .option('--no-mcp', 'Skip MCP configuration')
    .action(async (opts: { email?: string; password?: string; apiUrl?: string; mcp: boolean }) => {
      const baseUrl = (opts.apiUrl || getBaseUrl()).replace(/\/$/, '');

      // ── Check if already authenticated ──────────────────────────────────
      const existingCreds = resolveCredentials();
      if (existingCreds.apiKey) {
        console.log('Already authenticated (credentials found).');
        console.log('Skipping registration. To re-register, delete ~/.graspful/credentials.json first.');

        // Still configure MCP if requested
        if (opts.mcp) {
          configureMcp(existingCreds.apiKey);
        }

        output(
          { authenticated: true, baseUrl },
          'Ready. Run graspful create course --topic "Your Topic" to get started.',
        );
        return;
      }

      // ── Get email and password ──────────────────────────────────────────
      let email = opts.email;
      let password = opts.password;

      if (!email || !password) {
        if (!process.stdin.isTTY) {
          outputError('Non-interactive mode requires --email and --password flags.');
          process.exit(1);
        }

        console.log('Welcome to Graspful! Let\'s get you set up.\n');

        if (!email) {
          email = await prompt('Email: ');
        }
        if (!password) {
          password = await prompt('Password: ');
        }
      }

      if (!email || !password) {
        outputError('Email and password are required.');
        process.exit(1);
      }

      // ── Register ────────────────────────────────────────────────────────
      try {
        const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
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

        // Save credentials
        saveApiKeyCredentials(data.apiKey, baseUrl);

        console.log(`\nAccount created!`);
        console.log(`  Org: ${data.orgSlug}`);
        console.log(`  API key: ${data.apiKey} (saved to ~/.graspful/credentials.json)`);

        // ── Configure MCP ───────────────────────────────────────────────
        if (opts.mcp) {
          configureMcp(data.apiKey);
        }

        output(
          {
            userId: data.userId,
            orgSlug: data.orgSlug,
            apiKey: data.apiKey,
            baseUrl,
          },
          [
            '',
            'You\'re ready. Next steps:',
            `  graspful create course --topic "Your Topic" -o course.yaml`,
            `  graspful fill concept course.yaml <concept-id>`,
            `  graspful review course.yaml`,
            `  graspful import course.yaml --org ${data.orgSlug} --publish`,
          ].join('\n'),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        outputError(`Registration failed: ${msg}`);
        process.exit(1);
      }
    });
}

function configureMcp(apiKey: string): void {
  const editors = detectEditors();

  if (editors.length === 0) {
    console.log('\nNo supported editors detected. Add MCP manually:');
    console.log(JSON.stringify({
      mcpServers: {
        graspful: {
          command: 'npx',
          args: ['-y', '@graspful/mcp'],
          env: { GRASPFUL_API_KEY: apiKey },
        },
      },
    }, null, 2));
    return;
  }

  for (const editor of editors) {
    writeMcpConfig(editor.configPath, apiKey);
    console.log(`\nMCP configured for ${editor.name}: ${editor.configPath}`);
  }
}
