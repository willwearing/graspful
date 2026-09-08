"use client";

import { useBrand } from "@/lib/brand/context";
import { trackLandingCtaClick } from "@/lib/posthog/events";
import { LessonPreview } from "./lesson-preview";

interface HeroProps {
  headline: string;
  subheadline: string;
  ctaText: string;
}

export function Hero({ headline, subheadline, ctaText }: HeroProps) {
  const brand = useBrand();
  const isGraspful = brand.id === "graspful";
  const ctaHref = isGraspful ? "/docs/quickstart" : "/sign-up";

  return (
    <section className="border-b border-border bg-background pt-20">
      <div className={`mx-auto max-w-6xl gap-10 px-6 py-12 md:py-20 ${isGraspful ? "grid lg:grid-cols-2 lg:items-center" : "text-center"}`}>
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {headline}
          </h1>
          <p className={`mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground ${isGraspful ? "" : "mx-auto"}`}>
            {subheadline}
          </p>
          <a
            href={ctaHref}
            onClick={() => trackLandingCtaClick("hero", brand.id, ctaHref)}
            className="mt-7 inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {ctaText}
          </a>
        </div>
        {isGraspful && <LessonPreview />}
      </div>
    </section>
  );
}
