import { resolvePageBrand } from "@/lib/brand/resolve";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { FAQ } from "@/components/marketing/faq";
import { PricingSection } from "@/components/marketing/pricing";
import { CTA } from "@/components/marketing/cta";
import { CourseJsonLd, OrganizationJsonLd, CredentialJsonLd } from "@/components/seo/json-ld";

export default async function LandingPage() {
  const brand = await resolvePageBrand();

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
      <CourseJsonLd
        name={`${brand.name} -- Audio Exam Prep`}
        description={brand.seo.description}
        provider={brand.name}
        url={`https://${brand.domain}`}
      />
      <OrganizationJsonLd
        name={brand.name}
        url={`https://${brand.domain}`}
        description={brand.seo.description}
        logoUrl={`https://${brand.domain}${brand.logoUrl}`}
      />
      <CredentialJsonLd
        name={`${brand.name} Certification Prep`}
        description={brand.seo.description}
        url={`https://${brand.domain}`}
        educationalLevel="Professional"
        credentialCategory="Professional Certification"
      />
    </div>
  );
}
