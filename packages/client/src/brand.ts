import { BrandYamlSchema } from '@graspful/shared';

export interface CreateBrandResponse {
  brand: { slug: string; domain: string };
  domain: {
    verified: boolean;
    error?: string;
    dnsInstructions?: { type: string; name: string; value: string };
  };
}

export function brandYamlToCreateDto(raw: unknown) {
  const parsed = BrandYamlSchema.parse(raw);
  const { id, logoUrl, ...brand } = parsed.brand;
  return {
    slug: id,
    ...brand,
    logoUrl: logoUrl || '/icon.svg',
    theme: parsed.theme || {},
    landing: parsed.landing,
    seo: parsed.seo || {},
    pricing: parsed.pricing || {},
    contentScope: parsed.contentScope,
  };
}
