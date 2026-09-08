import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateBrandDto {
  @IsOptional() @IsString()
  name?: string;
  @IsOptional() @IsString()
  tagline?: string;
  @IsOptional() @IsString()
  logoUrl?: string;
  @IsOptional() @IsString()
  faviconUrl?: string;
  @IsOptional() @IsString()
  ogImageUrl?: string;
  @IsOptional() @IsObject()
  theme?: Record<string, unknown>;
  @IsOptional() @IsObject()
  landing?: Record<string, unknown>;
  @IsOptional() @IsObject()
  seo?: Record<string, unknown>;
  @IsOptional() @IsObject()
  pricing?: Record<string, unknown>;
  @IsOptional() @IsObject()
  contentScope?: Record<string, unknown>;
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
