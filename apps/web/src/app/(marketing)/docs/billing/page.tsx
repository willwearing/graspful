import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock, InlineCode } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Billing — Graspful Docs",
  description:
    "How billing works on Graspful. 70/30 revenue share, Stripe Connect setup, free tier, and API key management.",
  keywords: [
    "graspful billing",
    "revenue share",
    "stripe connect",
    "course pricing",
    "api key",
  ],
};

export default function BillingPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-[-0.04em] text-foreground">
        Billing
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        Graspful is free to use for course creation. You only pay when learners
        pay. The platform takes a 30% fee and you keep 70%.
      </p>

      {/* Revenue share */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="revenue-share">
          Revenue share model
        </h2>
        <p className="mt-2 text-muted-foreground">
          Every paid course on Graspful uses a 70/30 revenue split.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <div className="text-4xl font-bold text-foreground">70%</div>
            <div className="mt-2 text-sm font-medium text-foreground">
              You keep
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Direct deposit to your Stripe Connect account
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6 text-center">
            <div className="text-4xl font-bold text-foreground">30%</div>
            <div className="mt-2 text-sm font-medium text-foreground">
              Platform fee
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Covers hosting, adaptive engine, billing infrastructure
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border/50 bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Example:</strong> A learner pays
            $29/month for your AWS prep course. You receive $20.30 and Graspful
            retains $8.70. Payouts happen automatically via Stripe Connect.
          </p>
        </div>
      </section>

      {/* How money flows */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="how-money-flows">
          How money flows
        </h2>
        <div className="mt-6 space-y-4">
          {[
            {
              step: "1",
              title: "Learner subscribes",
              description:
                "A learner visits your brand's site and subscribes via Stripe Checkout. The charge goes to the Graspful Stripe account.",
            },
            {
              step: "2",
              title: "Platform processes payment",
              description:
                "Stripe processes the payment. Graspful's 30% platform fee is deducted automatically.",
            },
            {
              step: "3",
              title: "Your share is transferred",
              description:
                "The remaining 70% is transferred to your connected Stripe account. Standard Stripe payout schedules apply (typically 2 business days).",
            },
            {
              step: "4",
              title: "You get paid",
              description:
                "Stripe deposits your earnings into your bank account on the regular payout schedule.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-4 rounded-lg border border-border/30 bg-card px-5 py-4"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {item.step}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stripe Connect */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="stripe-connect">
          Stripe Connect setup
        </h2>
        <p className="mt-2 text-muted-foreground">
          To receive payouts, connect your Stripe account to your Graspful
          organization.
        </p>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li>
            Go to your organization settings in the Graspful dashboard.
          </li>
          <li>
            Click <strong className="text-foreground">Connect Stripe</strong>.
            This redirects you to Stripe&apos;s onboarding flow.
          </li>
          <li>
            Complete Stripe&apos;s identity and banking verification.
          </li>
          <li>
            Once connected, your organization shows a{" "}
            <InlineCode>connected</InlineCode> status. Payouts begin
            automatically on the next billing cycle.
          </li>
        </ol>
        <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> You can publish
            free courses without Stripe Connect. Stripe is only required when
            you want to charge learners.
          </p>
        </div>
      </section>

      {/* Free tier */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="free-tier">
          Free tier
        </h2>
        <p className="mt-2 text-muted-foreground">
          The following are always free, with no usage limits:
        </p>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>Creating and scaffolding courses (CLI + MCP)</li>
          <li>Filling concepts with content</li>
          <li>Running review quality checks</li>
          <li>Validating YAML schemas</li>
          <li>Importing courses as drafts</li>
          <li>Describing and inspecting course statistics</li>
          <li>Creating and importing brands</li>
          <li>
            Publishing free courses (set{" "}
            <InlineCode>pricing.monthly: 0</InlineCode> in the brand YAML)
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          You only start paying the 30% platform fee when learners pay you. If
          your course is free, Graspful is free.
        </p>
      </section>

      {/* API keys */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold text-foreground" id="api-keys">
          API key management
        </h2>
        <p className="mt-2 text-muted-foreground">
          API keys authenticate CLI and MCP operations that interact with the
          Graspful platform (import, publish, list courses).
        </p>

        <h3 className="mt-6 text-lg font-semibold text-foreground">
          Creating an API key
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create API keys in your organization settings or via the API:
        </p>
        <CodeBlock language="bash">
          {`# Via the API
curl -X POST https://api.graspful.ai/api/v1/orgs/my-org/api-keys \\
  -H "Authorization: Bearer <your-jwt>" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "CI Pipeline"}'`}
        </CodeBlock>

        <h3 className="mt-6 text-lg font-semibold text-foreground">
          Using API keys
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Pass the API key to the CLI via login, or to the MCP server via
          environment variable:
        </p>
        <CodeBlock language="bash">
          {`# CLI: save credentials
graspful login --token gsk_your_key_here

# MCP: set environment variable
export GRASPFUL_API_KEY=gsk_your_key_here`}
        </CodeBlock>

        <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-5">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Security:</strong> API keys have
            full access to your organization. Never commit them to version
            control. Use environment variables or secret managers in CI.
          </p>
        </div>
      </section>

      {/* API endpoints */}
      <section className="mt-12 rounded-xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-bold text-foreground">API endpoints</h2>
        <p className="mt-2 text-sm text-muted-foreground mb-4">
          The billing-related API endpoints. All require authentication.
        </p>
        <div className="space-y-2 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
              POST
            </span>
            <span className="text-muted-foreground">
              /api/v1/orgs/:orgId/api-keys
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
              POST
            </span>
            <span className="text-muted-foreground">
              /api/v1/brands
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-yellow-100 px-2 py-0.5 font-semibold text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              PATCH
            </span>
            <span className="text-muted-foreground">
              /api/v1/brands/:slug
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
              POST
            </span>
            <span className="text-muted-foreground">
              /api/v1/orgs/:orgId/courses/import
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded bg-green-100 px-2 py-0.5 font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
              POST
            </span>
            <span className="text-muted-foreground">
              /api/v1/orgs/:orgId/courses/:courseId/publish
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
