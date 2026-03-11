import type { Metadata } from "next";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { PricingSection } from "@/components/marketing/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await resolvePageBrand();

  return {
    title: `Pricing -- ${brand.name}`,
    description: `Plans and pricing for ${brand.name}. Start studying smarter with audio-first exam prep.`,
  };
}

export default function PricingPage() {
  return (
    <div className="bg-background text-foreground">
      <PricingSection />
    </div>
  );
}
