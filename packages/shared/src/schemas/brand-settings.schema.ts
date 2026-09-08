import { z } from 'zod';
import { BrandYamlSchema } from './brand-yaml.schema';

const landing = BrandYamlSchema.shape.landing;
const theme = BrandYamlSchema.shape.theme.unwrap();

/**
 * Brand edits must also accept the empty settings created during registration.
 * Validate known nested shapes without requiring a finished landing page.
 * Callers keep the original input so existing extension fields are preserved.
 */
export const BrandSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  ogImageUrl: z.string().optional(),
  theme: theme.partial().extend({
    gradient: theme.shape.gradient.unwrap().partial().optional(),
  }).optional(),
  landing: landing.partial().extend({
    hero: landing.shape.hero.partial().optional(),
    features: landing.shape.features.partial().extend({
      items: landing.shape.features.shape.items.element.array().optional(),
    }).optional(),
    howItWorks: landing.shape.howItWorks.partial().extend({
      items: landing.shape.howItWorks.shape.items.element.array().optional(),
    }).optional(),
    bottomCta: landing.shape.bottomCta.unwrap().partial().optional(),
  }).optional(),
  seo: BrandYamlSchema.shape.seo.unwrap().partial().optional(),
  pricing: BrandYamlSchema.shape.pricing.unwrap().partial().optional(),
  contentScope: BrandYamlSchema.shape.contentScope.unwrap().partial().optional(),
  isActive: z.boolean().optional(),
}).strict();
