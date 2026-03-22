import type { Metadata } from "next";
import Link from "next/link";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { PricingSection } from "@/components/marketing/pricing";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await resolvePageBrand();
  const url = `https://${brand.domain}/pricing`;

  return {
    title: "Pricing",
    description: `Plans and pricing for ${brand.name}. Free to create courses. 70/30 revenue share when learners pay.`,
    openGraph: {
      title: `Pricing — ${brand.name}`,
      description: `Free to create. 70/30 revenue share when learners pay. Plans and pricing for ${brand.name}.`,
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
      title: `Pricing — ${brand.name}`,
      description: `Free to create. 70/30 revenue share when learners pay.`,
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
      <PricingSection />
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
