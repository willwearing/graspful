import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";

export default function PricingPage() {
  return (
    <PageShell
      eyebrow="Pricing"
      title="Pricing"
      intro="Free to set up. You pay when learners pay."
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">What creators pay</h2>
        <p className="text-muted-foreground">
          No platform subscription. No setup fee. Graspful takes 30% of learner
          revenue and runs the infrastructure. You keep the rest.
        </p>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Creator share</p>
          <p className="text-4xl font-bold text-foreground mb-1">70%</p>
          <p className="text-sm text-muted-foreground">Majority of every paid subscription goes to you.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Platform share</p>
          <p className="text-4xl font-bold text-foreground mb-1">30%</p>
          <p className="text-sm text-muted-foreground">
            Covers hosting, the learner app, billing, adaptive engine, and support.
          </p>
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">What learners pay</h2>
        <p className="text-muted-foreground">
          You set the price. Graspful handles checkout, access control, and
          subscription management through Stripe.
        </p>
        <ul className="text-sm space-y-2 list-none p-0 mb-6">
          {[
            "Monthly and annual plans",
            "Checkout and payouts handled by Stripe",
            "Your own branded academy site",
            "One platform for course, billing, and learner access",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-primary">&#10003;</span> {item}
            </li>
          ))}
        </ul>
        <Link href={"/sign-up"} className="btn-gradient text-sm px-6 py-2">
          Start building
        </Link>
      </div>
    </PageShell>
  );
}
