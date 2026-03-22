import { Credentials } from './auth';

export class ApiClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(credentials: Credentials) {
    this.baseUrl = credentials.baseUrl.replace(/\/$/, '');
    this.headers = { 'Content-Type': 'application/json' };

    if (credentials.apiKey) {
      this.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
    } else if (credentials.jwt) {
      this.headers['Authorization'] = `Bearer ${credentials.jwt}`;
    }
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.headers,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API error ${res.status}: ${body}`);
    }
    return res.json() as T;
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json() as T;
  }

  async patch<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json() as T;
  }
}
