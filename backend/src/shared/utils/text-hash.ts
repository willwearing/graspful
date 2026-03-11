import { createHash } from 'crypto';

export function computeTextHash(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}
