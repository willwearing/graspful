import { z } from 'zod';

export const THEME_PRESETS = ['blue', 'red', 'green', 'orange', 'purple', 'slate', 'emerald', 'rose', 'amber', 'indigo'] as const;

const HslColorSchema = z.string().regex(/^\d{1,3}\s+\d{1,3}%?\s+\d{1,3}%?$/, 'Must be HSL format: "220 90% 50%"');

const BrandThemeColorsSchema = z.object({
  background: HslColorSchema.optional(),
  foreground: HslColorSchema.optional(),
  card: HslColorSchema.optional(),
  cardForeground: HslColorSchema.optional(),
  popover: HslColorSchema.optional(),
  popoverForeground: HslColorSchema.optional(),
  primary: HslColorSchema.optional(),
  primaryForeground: HslColorSchema.optional(),
  secondary: HslColorSchema.optional(),
  secondaryForeground: HslColorSchema.optional(),
  muted: HslColorSchema.optional(),
  mutedForeground: HslColorSchema.optional(),
  accent: HslColorSchema.optional(),
  accentForeground: HslColorSchema.optional(),
  destructive: HslColorSchema.optional(),
  destructiveForeground: HslColorSchema.optional(),
  border: HslColorSchema.optional(),
  input: HslColorSchema.optional(),
  ring: HslColorSchema.optional(),
});

const ThemeSchema = z.object({
  preset: z.enum(THEME_PRESETS).optional(),
  radius: z.string().default('0.5rem'),
  light: BrandThemeColorsSchema.optional(),
  dark: BrandThemeColorsSchema.optional(),
});

const FeatureItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  wide: z.boolean().optional(),
});

const LandingSchema = z.object({
  hero: z.object({
    headline: z.string().min(1),
    subheadline: z.string().min(1),
    ctaText: z.string().min(1),
  }),
  features: z.object({
    heading: z.string().min(1),
    subheading: z.string().optional(),
    items: z.array(FeatureItemSchema).min(1),
  }),
  howItWorks: z.object({
    heading: z.string().min(1),
    items: z.array(z.object({
      title: z.string().min(1),
      description: z.string().min(1),
    })).min(1),
  }),
  faq: z.array(z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
  })).optional().default([]),
  bottomCta: z.object({
    headline: z.string().min(1),
    subheadline: z.string().optional(),
  }).optional(),
});

const SeoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string()).optional().default([]),
});

const PricingSchema = z.object({
  monthly: z.number().nonnegative(),
  yearly: z.number().nonnegative().optional(),
  currency: z.string().default('usd'),
  trialDays: z.number().int().nonnegative().default(0),
});

export const BrandYamlSchema = z.object({
  brand: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    domain: z.string().min(1),
    tagline: z.string().min(1),
    logoUrl: z.string().optional(),
    faviconUrl: z.string().optional(),
    ogImageUrl: z.string().optional(),
    orgSlug: z.string().min(1),
  }),
  theme: ThemeSchema.optional(),
  landing: LandingSchema,
  seo: SeoSchema.optional(),
  pricing: PricingSchema.optional(),
  contentScope: z.object({
    courseIds: z.array(z.string()).optional().default([]),
  }).optional(),
});

export type BrandYaml = z.infer<typeof BrandYamlSchema>;
