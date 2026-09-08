"use client";

import { Check } from "lucide-react";
import { AuthLink } from "@/components/navigation/auth-link";
import { useBrand } from "@/lib/brand/context";
import { trackLandingCtaClick } from "@/lib/posthog/events";

type PricingHeadingLevel = "h1" | "h2";

export function PricingSection({ headingLevel = "h2" }: { headingLevel?: PricingHeadingLevel }) {
  const brand = useBrand();
  const Heading = headingLevel;
  const Subheading = headingLevel === "h1" ? "h2" : "h3";
  const isCreator = brand.id === "graspful";
  const features = isCreator
    ? ["Local authoring with CLI and MCP", "Course schema validation", "Automated publication checks", "Draft import and course management"]
    : ["Browse available courses", "Lessons and practice questions", "Review scheduling", "Progress tracking"];

  return (
    <section id="pricing" className="bg-background px-6 py-14 md:py-20">
      <div className="mx-auto max-w-3xl">
        <Heading className="text-center text-3xl font-bold text-foreground">Start with a free account</Heading>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
          {isCreator
            ? "Draft and review courses locally. Create an account when you are ready to import your work."
            : "Create an account to see the courses and access options available in this academy."}
        </p>
        <div className="mt-8 grid gap-6 rounded-xl border border-border bg-card p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <Subheading className="text-lg font-semibold text-foreground">Available now</Subheading>
            <ul className="mt-4 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{feature}
                </li>
              ))}
            </ul>
            <AuthLink
              href="/sign-up"
              onClick={() => trackLandingCtaClick("pricing_free", brand.id, "/sign-up")}
              className="mt-6 inline-block rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Create free account
            </AuthLink>
          </div>
          <div className="border-t border-border pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <Subheading className="text-lg font-semibold text-foreground">Paid subscriptions</Subheading>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Paid subscriptions are not available yet.</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">We will publish plan details when billing is ready. Account creation does not start a paid trial.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
