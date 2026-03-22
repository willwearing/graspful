export interface BrandThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
}

export interface BrandConfig {
  /** Unique slug: "firefighter", "pilot", "electrician" */
  id: string;
  /** Display name: "FirefighterPrep" */
  name: string;
  /** Custom domain: "firefighterprep.vercel.app" */
  domain: string;
  /** Tagline for header/meta */
  tagline: string;
  /** Logo URL */
  logoUrl: string;
  /** Favicon URL */
  faviconUrl: string;
  /** OG image URL */
  ogImageUrl: string;
  /** Backend organization slug this brand maps to */
  orgSlug: string;

  theme: {
    light: BrandThemeColors;
    dark: BrandThemeColors;
    radius: string;
  };

  landing: {
    hero: {
      headline: string;
      subheadline: string;
      ctaText: string;
    };
    features: {
      heading: string;
      subheading: string;
      items: Array<{
        title: string;
        description: string;
        icon: string;
        /** Optional: span 2 columns in bento grid. Defaults false. */
        wide?: boolean;
      }>;
    };
    howItWorks: {
      heading: string;
      items: Array<{
        title: string;
        description: string;
      }>;
    };
    faq: Array<{
      question: string;
      answer: string;
    }>;
    bottomCta: {
      headline: string;
      subheadline: string;
    };
  };

  seo: {
    title: string;
    description: string;
    keywords: string[];
  };

  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
    trialDays: number;
  };

  contentScope: {
    courseIds: string[];
  };
}
