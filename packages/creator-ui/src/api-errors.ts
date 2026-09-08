export async function readApiErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'message' in body) {
      if (typeof body.message === 'string' && body.message) return body.message;
      if (Array.isArray(body.message)) {
        const messages = body.message.filter((value): value is string => typeof value === 'string');
        if (messages.length > 0) return messages.join('\n');
      }
    }
  } catch {
    // Proxies can return an HTML error page instead of the API's JSON response.
  }
  return `API error: ${response.statusText || response.status}`;
}
