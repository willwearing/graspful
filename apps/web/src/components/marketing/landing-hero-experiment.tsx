"use client";

import { useEffect, useRef, useState } from "react";
import { Hero } from "@/components/marketing/hero";
import { ProductProofHero } from "@/components/marketing/product-proof-hero";
import {
  type FeatureFlagVariant,
  useFeatureFlagVariant,
} from "@/lib/posthog/useFeatureFlag";

export const HOMEPAGE_PRODUCT_PROOF_FLAG = "homepage-product-proof-v1";

interface LandingHeroExperimentProps {
  isGraspful: boolean;
  headline: string;
  subheadline: string;
  ctaText: string;
}

function GraspfulHeroExperiment(
  props: Omit<LandingHeroExperimentProps, "isGraspful">,
) {
  const variant = useFeatureFlagVariant(HOMEPAGE_PRODUCT_PROOF_FLAG);
  const [settledVariant, setSettledVariant] =
    useState<FeatureFlagVariant>(variant);
  const hasSettled = useRef(variant !== undefined);

  useEffect(() => {
    if (hasSettled.current) return;

    if (variant !== undefined) {
      hasSettled.current = true;
      setSettledVariant(variant);
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      hasSettled.current = true;
      setSettledVariant("control");
    }, 500);

    return () => window.clearTimeout(fallbackTimer);
  }, [variant]);

  if (settledVariant === undefined) {
    return (
      <div
        className="invisible min-h-[78vh]"
        data-landing-variant="loading"
        aria-hidden="true"
      >
        <Hero {...props} />
      </div>
    );
  }

  if (settledVariant === "product-proof") {
    return <ProductProofHero />;
  }

  return <Hero {...props} />;
}

export function LandingHeroExperiment({
  isGraspful,
  ...heroProps
}: LandingHeroExperimentProps) {
  if (!isGraspful) {
    return <Hero {...heroProps} />;
  }

  return <GraspfulHeroExperiment {...heroProps} />;
}
