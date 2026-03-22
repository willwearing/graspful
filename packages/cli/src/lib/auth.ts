import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Credentials {
  apiKey?: string;
  jwt?: string;
  baseUrl: string;
}

const CREDENTIALS_PATH = path.join(os.homedir(), '.graspful', 'credentials.json');

export function getBaseUrl(): string {
  return process.env.GRASPFUL_API_URL || 'https://api.graspful.com';
}

export function resolveCredentials(): Credentials {
  const baseUrl = getBaseUrl();

  // 1. API key (agent mode)
  const apiKey = process.env.GRASPFUL_API_KEY;
  if (apiKey) {
    return { apiKey, baseUrl };
  }

  // 2. Stored credentials (interactive mode)
  if (fs.existsSync(CREDENTIALS_PATH)) {
    try {
      const stored = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
      return { jwt: stored.jwt, baseUrl: stored.baseUrl || baseUrl };
    } catch {
      // Invalid file
    }
  }

  return { baseUrl };
}

export function saveCredentials(jwt: string, baseUrl?: string): void {
  const dir = path.dirname(CREDENTIALS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(
    CREDENTIALS_PATH,
    JSON.stringify({ jwt, baseUrl: baseUrl || getBaseUrl() }, null, 2),
    { mode: 0o600 },
  );
}

export function requireAuth(): Credentials {
  const creds = resolveCredentials();
  if (!creds.apiKey && !creds.jwt) {
    console.error('Not authenticated. Set GRASPFUL_API_KEY or run: graspful login');
    process.exit(1);
  }
  return creds;
}
