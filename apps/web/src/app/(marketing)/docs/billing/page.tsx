import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Billing | Graspful docs",
  description: "Current billing availability for Graspful. Free account creation and local course authoring are available. Paid subscriptions are not available yet.",
  alternates: { canonical: "https://graspful.ai/docs/billing" },
};

export default function BillingPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight text-foreground">Billing</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">Paid subscriptions are not available yet.</p>
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-foreground" id="available-now">What is available now</h2>
        <p className="mt-3 text-muted-foreground">You can create a free account. You can also scaffold, author, validate, and review course files locally with the CLI or MCP, before you create an account.</p>
        <p className="mt-3 text-muted-foreground">Import and publication require an account. Course publication also requires the automated checks to pass. Learner access depends on the course and academy settings.</p>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-bold text-foreground" id="paid-subscriptions">Paid subscriptions and payouts</h2>
        <p className="mt-3 text-muted-foreground">Payment setup is still in progress. Creating an account does not start a paid trial. Paid plans, creator revenue share, and payout terms will be published when these services are ready.</p>
        <p className="mt-3 text-muted-foreground">The account settings page shows whether billing actions are available. A course price in a brand file does not activate payments.</p>
      </section>
      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="text-xl font-bold text-foreground">Start authoring</h2>
        <p className="mt-3 text-muted-foreground">Follow the <Link href="/docs/quickstart" className="text-primary underline">quickstart</Link> for the draft, review, import, and publish workflow. Use the <Link href="/docs/cli" className="text-primary underline">CLI reference</Link> for authentication and API key setup.</p>
      </section>
    </div>
  );
}
