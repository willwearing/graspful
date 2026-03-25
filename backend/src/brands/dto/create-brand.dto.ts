import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateBrandDto {
  @IsString() @IsNotEmpty() slug!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() domain!: string;
  @IsString() tagline!: string;
  @IsString() logoUrl!: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() ogImageUrl?: string;
  @IsString() @IsNotEmpty() orgSlug!: string;
  @IsObject() theme!: Record<string, unknown>;
  @IsObject() landing!: Record<string, unknown>;
  @IsObject() seo!: Record<string, unknown>;
  @IsObject() pricing!: Record<string, unknown>;
  @IsOptional() @IsObject() contentScope?: Record<string, unknown>;
}
