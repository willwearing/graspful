export class UpdateBrandDto {
  name?: string;
  tagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  theme?: Record<string, unknown>;
  landing?: Record<string, unknown>;
  seo?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  contentScope?: Record<string, unknown>;
  isActive?: boolean;
}
