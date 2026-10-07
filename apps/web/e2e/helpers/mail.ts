import { expect, type Page } from "@playwright/test";
import { assertLocalUrl } from "../../../../backend/scripts/e2e-env";

const mailpitUrl = assertLocalUrl(process.env.E2E_MAILPIT_URL || "http://127.0.0.1:54324", "E2E_MAILPIT_URL");

interface MailMessage {
  ID: string;
  To: Array<{ Address: string }>;
  Subject: string;
}

export async function messagesFor(email: string): Promise<MailMessage[]> {
  const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=1000`);
  if (!response.ok) throw new Error(`Mailpit returned ${response.status}`);
  const body = await response.json() as { messages: MailMessage[] };
  return body.messages.filter((message) => message.To.some((recipient) => recipient.Address === email));
}

export async function waitForEmailLink(email: string, subject: RegExp, afterId?: string): Promise<{ id: string; url: string }> {
  let message: MailMessage | undefined;
  await expect.poll(async () => {
    message = (await messagesFor(email)).find((candidate) => subject.test(candidate.Subject) && candidate.ID !== afterId);
    return Boolean(message);
  }, { timeout: 15_000, message: `Expected a real auth email for ${email}` }).toBe(true);
  const response = await fetch(`${mailpitUrl}/api/v1/message/${message!.ID}`);
  if (!response.ok) throw new Error(`Mailpit message returned ${response.status}`);
  const body = await response.json() as { HTML: string };
  const links = [...body.HTML.matchAll(/href="([^"]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&"));
  const url = links.find((link) => {
    const path = new URL(link).pathname;
    return path.endsWith("/auth/v1/verify") || path === "/auth/callback" || path === "/auth/confirm";
  });
  if (!url) throw new Error("Auth email did not include a verification link");
  // Only local Supabase email links can be followed by a mutating test.
  assertLocalUrl(url, "Auth email link");
  return { id: message!.ID, url };
}

/** Follow the delivered link, keeping the browser's PKCE verifier cookie. */
export async function confirmSignupEmail(page: Page, email: string): Promise<void> {
  await expect(page.getByText("Check your email", { exact: true })).toBeVisible();
  const { url } = await waitForEmailLink(email, /confirm/i);
  await page.goto(url);
}
