export class CreateBrandDto {
  slug!: string;
  name!: string;
  domain!: string;
  tagline!: string;
  logoUrl!: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  orgSlug!: string;
  theme!: Record<string, unknown>;
  landing!: Record<string, unknown>;
  seo!: Record<string, unknown>;
  pricing!: Record<string, unknown>;
  contentScope?: Record<string, unknown>;
}
