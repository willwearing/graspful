import type { Metadata } from "next";
import { resolvePageBrand } from "@/lib/brand/resolve";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FAQ } from "@/components/marketing/faq";
import { PricingSection } from "@/components/marketing/pricing";
import { CTA } from "@/components/marketing/cta";
import {
  CourseJsonLd,
  OrganizationJsonLd,
  CredentialJsonLd,
  WebSiteJsonLd,
  SoftwareApplicationJsonLd,
  FAQPageJsonLd,
} from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await resolvePageBrand();
  const url = `https://${brand.domain}`;

  return {
    title: brand.seo.title,
    description: brand.seo.description,
    keywords: brand.seo.keywords,
    openGraph: {
      type: "website",
      locale: "en_US",
      url,
      siteName: brand.name,
      title: brand.seo.title,
      description: brand.seo.description,
      images: brand.ogImageUrl
        ? [
            {
              url: brand.ogImageUrl,
              width: 1200,
              height: 630,
              alt: brand.seo.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: brand.seo.title,
      description: brand.seo.description,
      images: brand.ogImageUrl ? [brand.ogImageUrl] : [],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function LandingPage() {
  const brand = await resolvePageBrand();
  const url = `https://${brand.domain}`;

  return (
    <div className="bg-background text-foreground">
      <Hero
        headline={brand.landing.hero.headline}
        subheadline={brand.landing.hero.subheadline}
        ctaText={brand.landing.hero.ctaText}
      />
      <Features
        heading={brand.landing.features.heading}
        subheading={brand.landing.features.subheading}
        features={brand.landing.features.items}
      />
      <HowItWorks
        heading={brand.landing.howItWorks.heading}
        steps={brand.landing.howItWorks.items}
      />
      <PricingSection />
      <FAQ items={brand.landing.faq} />
      <CTA
        ctaText={brand.landing.hero.ctaText}
        headline={brand.landing.bottomCta.headline}
        subheadline={brand.landing.bottomCta.subheadline}
      />
      <WebSiteJsonLd
        name={brand.name}
        url={url}
        description={brand.seo.description}
      />
      <SoftwareApplicationJsonLd
        name={brand.name}
        description={brand.seo.description}
        url={url}
        applicationCategory="EducationalApplication"
        operatingSystem="Web"
        offers={{ price: 0, priceCurrency: "USD" }}
      />
      <FAQPageJsonLd items={brand.landing.faq} />
      <CourseJsonLd
        name={`${brand.name} -- Audio Exam Prep`}
        description={brand.seo.description}
        provider={brand.name}
        url={url}
      />
      <OrganizationJsonLd
        name={brand.name}
        url={url}
        description={brand.seo.description}
        logoUrl={`${url}${brand.logoUrl}`}
      />
      <CredentialJsonLd
        name={`${brand.name} Certification Prep`}
        description={brand.seo.description}
        url={url}
        educationalLevel="Professional"
        credentialCategory="Professional Certification"
      />
    </div>
  );
}
