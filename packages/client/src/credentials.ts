import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface Credentials {
  apiKey?: string;
  jwt?: string;
  userId?: string;
  baseUrl: string;
}

export function credentialsPath(): string {
  return path.join(process.env.GRASPFUL_CONFIG_DIR || path.join(os.homedir(), '.graspful'), 'credentials.json');
}

export function getBaseUrl(): string {
  return process.env.GRASPFUL_API_URL || 'https://api.graspful.ai';
}

function nonemptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function resolveCredentials(): Credentials {
  const baseUrl = getBaseUrl();
  if (process.env.GRASPFUL_API_KEY) {
    return { apiKey: process.env.GRASPFUL_API_KEY, userId: process.env.GRASPFUL_USER_ID, baseUrl };
  }
  try {
    const stored: unknown = JSON.parse(fs.readFileSync(credentialsPath(), 'utf-8'));
    if (stored && typeof stored === 'object') {
      const values = stored as Record<string, unknown>;
      return {
        apiKey: nonemptyString(values.apiKey),
        jwt: nonemptyString(values.jwt),
        userId: process.env.GRASPFUL_USER_ID || nonemptyString(values.userId),
        baseUrl: process.env.GRASPFUL_API_URL || nonemptyString(values.baseUrl) || baseUrl,
      };
    }
  } catch {
    // Missing or malformed local credentials fall back to unauthenticated mode.
  }
  return { baseUrl };
}

function writeCredentials(credentials: Credentials): void {
  const filename = credentialsPath();
  fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filename, JSON.stringify(credentials, null, 2), { mode: 0o600 });
  // writeFileSync does not update permissions on an existing file.
  fs.chmodSync(filename, 0o600);
}

export function saveCredentials(jwt: string, baseUrl = getBaseUrl()): void {
  writeCredentials({ jwt, baseUrl });
}

export function saveApiKeyCredentials(apiKey: string, baseUrl = getBaseUrl(), userId?: string): void {
  writeCredentials({ apiKey, userId, baseUrl });
}

export function requireAuth(): Credentials {
  const credentials = resolveCredentials();
  if (!credentials.apiKey && !credentials.jwt) {
    throw new Error('Not authenticated. Set GRASPFUL_API_KEY or run: graspful login (existing account) / graspful register (new account). You can scaffold, validate, and review courses without authentication.');
  }
  return credentials;
}

export function maskApiKey(apiKey: string): string {
  return apiKey.length > 12 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '****';
}
