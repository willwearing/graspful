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

  return (
    <section className="relative overflow-hidden py-32 md:py-44 bg-white dark:bg-background">
      <div className="gradient-mesh opacity-20">
        <div className="orb-1" />
        <div className="orb-2" />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <h2 className="text-4xl font-bold tracking-[-0.04em] text-foreground sm:text-5xl lg:text-7xl mb-4">
          {headline}
        </h2>
        <p className="text-lg text-muted-foreground mb-2">
          {subheadline}
        </p>
        <p className="text-sm text-muted-foreground/70 mb-10">
          Free to start. No credit card required.
        </p>
        <a
          href="/sign-up"
          onClick={() => {
            trackLandingCtaClick("bottom", brand.id);
          }}
          className="btn-gradient glow-pulse inline-block px-12 py-4 text-base font-medium"
        >
          {ctaText}
        </a>
      </div>
    </section>
  );
}
