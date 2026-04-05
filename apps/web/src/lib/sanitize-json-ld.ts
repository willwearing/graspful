/** Safely serialize data for embedding in a <script> tag. */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
