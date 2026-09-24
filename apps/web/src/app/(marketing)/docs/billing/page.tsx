import { Callout } from "@/components/docs/callout";
import { DocSection } from "@/components/docs/doc-section";
import { DocPage } from "@/components/docs/doc-page";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Billing | Graspful docs",
  description: "Current billing availability for Graspful. Free account creation and local course authoring are available. Paid subscriptions are not available yet.",
  alternates: { canonical: "https://graspful.ai/docs/billing" },
};

export default function BillingPage() {
  return (
    <DocPage
      title="Billing"
      titleClassName="tracking-tight"
      description="Paid subscriptions are not available yet."
    >
      <DocSection title="What is available now" headingId="available-now" className="mt-10">
        <p className="mt-3 text-muted-foreground">You can create a free account. You can also scaffold, author, validate, and review course files locally with the CLI or MCP, before you create an account.</p>
        <p className="mt-3 text-muted-foreground">Import and publication require an account. Course publication also requires the automated checks to pass. Learner access depends on the course and academy settings.</p>
      </DocSection>
      <DocSection title="Paid subscriptions and payouts" headingId="paid-subscriptions" className="mt-10">
        <p className="mt-3 text-muted-foreground">Payment setup is still in progress. Creating an account does not start a paid trial. Paid plans, creator revenue share, and payout terms will be published when these services are ready.</p>
        <p className="mt-3 text-muted-foreground">The account settings page shows whether billing actions are available. A course price in a brand file does not activate payments.</p>
      </DocSection>
      <Callout as="section" className="mt-10 border-border" title="Start authoring" titleClassName="text-xl font-bold text-foreground">
        <p className="mt-3 text-muted-foreground">Follow the <Link href="/docs/quickstart" className="text-primary underline">quickstart</Link> for the draft, review, import, and publish workflow. Use the <Link href="/docs/cli" className="text-primary underline">CLI reference</Link> for authentication and API key setup.</p>
      </Callout>
    </DocPage>
  );
}
