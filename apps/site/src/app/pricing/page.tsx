import Link from "next/link";
import { PageShell } from "@/components/site/page-shell";
import { appUrl } from "@/lib/site-config";

export default function PricingPage() {
  return (
    <PageShell
      eyebrow="Pricing"
      title="Pricing and payouts"
      intro="Graspful is free to set up. Revenue is shared when learners subscribe."
    >
      <div>
        <h2 className="section-heading">What creators pay</h2>
        <p className="section-intro">
          There is no platform subscription. Graspful takes 30% of learner
          revenue after checkout and keeps the infrastructure running.
        </p>
        <div className="callout-card">
          <p className="callout-label">Creator share</p>
          <p className="callout-value">70%</p>
          <p className="callout-copy">You keep the majority of every paid subscription.</p>
        </div>
        <div className="callout-card">
          <p className="callout-label">Platform share</p>
          <p className="callout-value">30%</p>
          <p className="callout-copy">
            Covers hosting, learner app, billing, adaptive engine, and support surface.
          </p>
        </div>
      </div>
      <div>
        <h2 className="section-heading">What learners pay</h2>
        <p className="section-intro">
          You decide what the learner sees as the public plan. Graspful handles
          checkout, access control, and subscription plumbing.
        </p>
        <ul className="plain-list">
          <li>Monthly and annual plan support</li>
          <li>Checkout and payout flows handled by Stripe</li>
          <li>Public academy pages under your own domain</li>
          <li>One operational surface for course, billing, and learner access</li>
        </ul>
        <Link href={`${appUrl}/sign-up`} className="button">
          Start building a course
        </Link>
      </div>
    </PageShell>
  );
}
