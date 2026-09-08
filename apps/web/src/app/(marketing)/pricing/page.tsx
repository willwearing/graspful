import type { Metadata } from "next";
import Link from "next/link";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { PricingSection } from "@/components/marketing/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await resolvePageBrand();
  const url = `https://${brand.domain}/pricing`;

  return {
    title: "Pricing",
    description: `Plans and pricing for ${brand.name}. Free account access and current billing availability.`,
    openGraph: {
      title: `Pricing: ${brand.name}`,
      description: `Create a free account. Paid subscriptions are not available yet. Plans and pricing for ${brand.name}.`,
      url,
      images: brand.ogImageUrl
        ? [
            {
              url: brand.ogImageUrl,
              width: 1200,
              height: 630,
              alt: `${brand.name} Pricing`,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `Pricing: ${brand.name}`,
      description: `Create a free account. Paid subscriptions are not available yet.`,
      images: brand.ogImageUrl ? [brand.ogImageUrl] : [],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function PricingPage() {
  return (
    <div className="bg-background text-foreground">
      <PricingSection headingLevel="h1" />
      <div className="mx-auto max-w-3xl px-6 pb-16 text-center">
        <p className="text-sm text-muted-foreground">
          Ready to start?{" "}
          <Link
            href="/agents"
            className="font-medium text-primary hover:underline"
          >
            See how AI agents build courses
          </Link>{" "}
          or{" "}
          <Link
            href="/docs/quickstart"
            className="font-medium text-primary hover:underline"
          >
            read the quickstart guide
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
