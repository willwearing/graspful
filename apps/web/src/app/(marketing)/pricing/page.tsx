import type { Metadata } from "next";
import { headers } from "next/headers";
import { resolveBrand } from "@/lib/brand/resolve";
import { PricingSection } from "@/components/marketing/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get("host") || "localhost";
  const brand = await resolveBrand(hostname);

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
