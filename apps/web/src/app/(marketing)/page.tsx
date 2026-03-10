import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";
import { Hero } from "@/components/marketing/hero";

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
      {/* Remaining sections added in Task 8 */}
    </div>
  );
}
