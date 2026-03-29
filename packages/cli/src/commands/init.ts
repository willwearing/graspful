import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getBaseUrl, resolveCredentials } from '../lib/auth';
import { runBrowserAuthFlow } from '../lib/browser-auth';
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

export function registerInitCommand(program: Command) {
  program
    .command('init')
    .description('Set up Graspful: authenticate in the browser and configure MCP for your editor')
    .option('--email <email>', 'Prefill the browser sign-up form')
    .option('--password <password>', 'Deprecated. Password entry now happens in the browser.')
    .option('--api-url <url>', 'API base URL')
    .option('--no-mcp', 'Skip MCP configuration')
    .option('--no-browser', 'Print the sign-up URL instead of opening it automatically')
    .action(async (opts: { email?: string; password?: string; apiUrl?: string; mcp: boolean; browser?: boolean }) => {
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

      // ── Browser sign-up ────────────────────────────────────────────────
      try {
        if (opts.password) {
          console.log('`--password` is deprecated. Complete the password and verification steps in your browser.');
        }

        const data = await runBrowserAuthFlow({
          apiUrl: baseUrl,
          mode: 'sign-up',
          email: opts.email,
          noBrowser: opts.browser === false,
        });

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
