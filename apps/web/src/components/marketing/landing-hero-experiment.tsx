"use client";

import { Hero } from "@/components/marketing/hero";
import { ProductProofHero } from "@/components/marketing/product-proof-hero";
import {
  HOMEPAGE_PRODUCT_PROOF_FLAG,
  HOMEPAGE_PRODUCT_PROOF_VARIANT,
} from "@/lib/experiments/homepage";
import { useFeatureFlagVariant } from "@/lib/posthog/useFeatureFlag";

interface LandingHeroExperimentProps {
  /** Variant assigned during server rendering. Null keeps the visitor out of the experiment. */
  variant: string | true | null;
  headline: string;
  subheadline: string;
  ctaText: string;
}

function AssignedHero({
  variant,
  ...heroProps
}: Omit<LandingHeroExperimentProps, "variant"> & { variant: string | true }) {
  // posthog-js is bootstrapped with the server's assignment, so reading the
  // flag records the exposure for the hero that was rendered.
  useFeatureFlagVariant(HOMEPAGE_PRODUCT_PROOF_FLAG);

  if (variant === HOMEPAGE_PRODUCT_PROOF_VARIANT) {
    return <ProductProofHero />;
  }

  return <Hero {...heroProps} />;
}

export function LandingHeroExperiment({ variant, ...heroProps }: LandingHeroExperimentProps) {
  if (variant === null) {
    return <Hero {...heroProps} />;
  }

  return <AssignedHero variant={variant} {...heroProps} />;
}
