import { spawn } from 'child_process';
import { saveApiKeyCredentials } from './auth';

export type BrowserAuthMode = 'sign-in' | 'sign-up';

interface StartBrowserAuthResponse {
  token: string;
  expiresAt: string;
  pollIntervalMs: number;
}

interface ExchangePendingResponse {
  status: 'pending';
}

interface ExchangeExpiredResponse {
  status: 'expired';
}

interface ExchangeCompleteResponse {
  status: 'complete';
  apiKey: string;
  orgSlug: string;
  userId: string;
}

type ExchangeBrowserAuthResponse =
  | ExchangePendingResponse
  | ExchangeExpiredResponse
  | ExchangeCompleteResponse;

interface BrowserAuthOptions {
  apiUrl: string;
  mode: BrowserAuthMode;
  email?: string;
  noBrowser?: boolean;
  fetchImpl?: typeof fetch;
  openUrl?: (url: string) => boolean;
  sleep?: (ms: number) => Promise<void>;
  onInfo?: (message: string) => void;
}

export interface BrowserAuthResult {
  apiKey: string;
  orgSlug: string;
  userId: string;
  baseUrl: string;
}

export function deriveWebUrl(apiUrl: string): string {
  const url = new URL(apiUrl);

  if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port === '3000') {
    url.port = '3001';
    return url.origin;
  }

  if (url.hostname.startsWith('api.')) {
    url.hostname = url.hostname.slice(4);
  }

  return url.origin;
}

export function buildCliAuthUrl(apiUrl: string, token: string, mode: BrowserAuthMode, email?: string): string {
  const url = new URL('/cli-auth', deriveWebUrl(apiUrl));
  url.searchParams.set('mode', mode);
  if (email) {
    url.searchParams.set('email', email);
  }
  url.hash = `token=${encodeURIComponent(token)}`;
  return url.toString();
}

export function openExternalUrl(url: string): boolean {
  const command = (() => {
    if (process.platform === 'darwin') return ['open', url];
    if (process.platform === 'win32') return ['cmd', '/c', 'start', '', url];
    return ['xdg-open', url];
  })();

  try {
    const child = spawn(command[0], command.slice(1), {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

export async function runBrowserAuthFlow(options: BrowserAuthOptions): Promise<BrowserAuthResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const openUrl = options.openUrl ?? openExternalUrl;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const onInfo = options.onInfo ?? console.log;
  const baseUrl = options.apiUrl.replace(/\/$/, '');

  const startRes = await fetchImpl(`${baseUrl}/api/v1/auth/cli/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: options.mode }),
  });

  if (!startRes.ok) {
    const body = await startRes.text();
    throw new Error(body || `Browser auth failed (${startRes.status})`);
  }

  const startData = (await startRes.json()) as StartBrowserAuthResponse;
  const authUrl = buildCliAuthUrl(baseUrl, startData.token, options.mode, options.email);

  if (!options.noBrowser) {
    const opened = openUrl(authUrl);
    if (!opened) {
      onInfo('Could not open a browser automatically.');
    }
  }

  onInfo(
    [
      options.mode === 'sign-up'
        ? 'Complete sign-up in your browser to finish CLI setup.'
        : 'Complete sign-in in your browser to finish CLI setup.',
      `Open this URL if it did not launch automatically:\n${authUrl}`,
      '',
      'Waiting for browser authentication...',
    ].join('\n'),
  );

  const expiresAt = new Date(startData.expiresAt).getTime();
  const pollIntervalMs = Math.max(startData.pollIntervalMs, 1_000);

  while (Date.now() < expiresAt) {
    const exchangeRes = await fetchImpl(`${baseUrl}/api/v1/auth/cli/sessions/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: startData.token }),
    });

    if (!exchangeRes.ok) {
      const body = await exchangeRes.text();
      throw new Error(body || `Browser auth exchange failed (${exchangeRes.status})`);
    }

    const exchangeData = (await exchangeRes.json()) as ExchangeBrowserAuthResponse;
    if (exchangeData.status === 'pending') {
      await sleep(pollIntervalMs);
      continue;
    }
    if (exchangeData.status === 'expired') {
      throw new Error('Browser authentication expired. Start again.');
    }

    saveApiKeyCredentials(exchangeData.apiKey, baseUrl);
    return {
      apiKey: exchangeData.apiKey,
      orgSlug: exchangeData.orgSlug,
      userId: exchangeData.userId,
      baseUrl,
    };
  }

  throw new Error('Browser authentication timed out. Start again.');
}
