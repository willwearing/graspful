"use client";

import { Hero } from "@/components/marketing/hero";
import { ProductProofHero } from "@/components/marketing/product-proof-hero";
import { useHostSurface } from "@/lib/host-context";
import { useFeatureFlagVariant } from "@/lib/posthog/useFeatureFlag";

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
  const variant = useFeatureFlagVariant(HOMEPAGE_PRODUCT_PROOF_FLAG, {
    fallbackAfterMs: 2000,
    fallbackVariant: "control",
  });

  if (variant === undefined) {
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

  if (variant === "product-proof") {
    return <ProductProofHero />;
  }

  return <Hero {...props} />;
}

export function LandingHeroExperiment({
  isGraspful,
  ...heroProps
}: LandingHeroExperimentProps) {
  const hostSurface = useHostSurface();

  if (!isGraspful || hostSurface !== "platform") {
    return <Hero {...heroProps} />;
  }

  return <GraspfulHeroExperiment {...heroProps} />;
}
