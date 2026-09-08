"use client";

import { useBrand } from "@/lib/brand/context";
import { trackLandingCtaClick } from "@/lib/posthog/events";

interface CTAProps {
  ctaText: string;
  headline: string;
  subheadline: string;
}

export function CTA({ ctaText, headline, subheadline }: CTAProps) {
  const brand = useBrand();
  const ctaHref = brand.id === "graspful" ? "/docs/quickstart" : "/sign-up";

  return (
    <section className="relative overflow-hidden py-16 md:py-20 bg-white dark:bg-background">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl lg:text-5xl mb-4">
          {headline}
        </h2>
        <p className="text-lg text-muted-foreground mb-2">
          {subheadline}
        </p>
        <p className="text-sm text-muted-foreground/70 mb-10">
          Free to start. No credit card required.
        </p>
        <a
          href={ctaHref}
          onClick={() => {
            trackLandingCtaClick("bottom", brand.id, ctaHref);
          }}
          className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {ctaText}
        </a>
      </div>
    </section>
  );
}
