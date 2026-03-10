import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FAQ } from "@/components/marketing/faq";
import { CTA } from "@/components/marketing/cta";

export default async function LandingPage() {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);

  return (
    <div className="bg-background text-foreground">
      <Hero
        headline={brand.landing.hero.headline}
        subheadline={brand.landing.hero.subheadline}
        ctaText={brand.landing.hero.ctaText}
      />
      <Features features={brand.landing.features} />
      <HowItWorks steps={brand.landing.howItWorks} />
      <FAQ items={brand.landing.faq} />
      <CTA ctaText={brand.landing.hero.ctaText} />
    </div>
  );
}
