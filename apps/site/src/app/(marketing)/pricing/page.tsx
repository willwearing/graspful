import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";

export default function PricingPage() {
  return (
    <PageShell eyebrow="Pricing" title="Pricing" intro="Start with a free account to author and review courses.">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Build and review</h2>
        <p className="mb-6 leading-relaxed text-muted-foreground">Use your coding agent with the CLI or MCP tools to write course YAML. Run local validation and review checks, then sign in to import a draft.</p>
        <ul className="mb-6 list-disc space-y-3 pl-5 text-sm text-muted-foreground">
          <li>Author source files locally.</li>
          <li>Validate course structure and run quality checks.</li>
          <li>Inspect imported courses in the creator app.</li>
          <li>Publish a reviewed course with the CLI or MCP tools.</li>
        </ul>
        <Link href="/sign-up" className="inline-block rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground no-underline hover:opacity-90">Create free account</Link>
      </div>
      <div className="self-start rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold">Paid subscriptions are not available yet</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Payment setup is still in progress. Pricing and payment terms will be available before paid subscriptions open.</p>
      </div>
    </PageShell>
  );
}
