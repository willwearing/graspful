import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, JwtOrApiKeyGuard, CurrentUser } from '@/auth';
import type { AuthUser } from '@/auth';
import { BrandsService } from './brands.service';
import { BrandAccessService } from './brand-access.service';
import { VercelDomainsService } from '@/shared/application/vercel-domains.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandSettingsSchema } from '@graspful/shared';

@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brandsService: BrandsService,
    private readonly brandAccess: BrandAccessService,
    private readonly vercelDomainsService: VercelDomainsService,
  ) {}

  @Get()
  async getAll() {
    return this.brandsService.findAll();
  }

  @Get('catalog/academies')
  async getPublicAcademyCatalog() {
    return this.brandsService.getPublicAcademyCatalog();
  }

  @Get('by-domain/:domain')
  async getByDomain(@Param('domain') domain: string) {
    const brand = await this.brandsService.findByDomain(domain);
    if (!brand)
      throw new NotFoundException(`Brand not found for domain: ${domain}`);
    return brand;
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const brand = await this.brandsService.findBySlug(slug);
    if (!brand) throw new NotFoundException(`Brand not found: ${slug}`);
    return brand;
  }

  @Post()
  @UseGuards(JwtOrApiKeyGuard)
  async create(@Body() dto: CreateBrandDto, @CurrentUser() user: AuthUser) {
    // The caller must own the org they are claiming, and may not take over a
    // slug or domain that already belongs to a different org.
    await this.brandAccess.assertCanManageOrg(user, dto.orgSlug);
    await this.brandAccess.assertSlugAvailableToOrg(dto.slug, dto.orgSlug);
    const domain = await this.brandAccess.assertDomainAvailableToOrg(dto.domain, dto.orgSlug);

    return this.brandsService.createWithDomain({ ...dto, domain });
  }

  @Patch(':slug')
  @UseGuards(SupabaseAuthGuard)
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateBrandDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.brandAccess.assertCanManageBrand(user, slug);
    const validation = BrandSettingsSchema.safeParse(dto);
    if (!validation.success) {
      throw new BadRequestException(validation.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '));
    }
    return this.brandsService.update(slug, dto);
  }

  @Delete(':slug')
  @UseGuards(SupabaseAuthGuard)
  async delete(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    await this.brandAccess.assertCanManageBrand(user, slug);
    return this.brandsService.delete(slug);
  }

  @Get(':slug/domain-status')
  async getDomainStatus(@Param('slug') slug: string) {
    const brand = await this.brandsService.findBySlug(slug);
    if (!brand) throw new NotFoundException(`Brand not found: ${slug}`);
    try {
      const status = await this.vercelDomainsService.getDomainStatus(
        brand.domain,
      );
      const dnsInstructions =
        await this.vercelDomainsService.getDnsInstructions(brand.domain);
      return { ...status, dnsInstructions };
    } catch (error) {
      return { verified: false, error: String(error) };
    }
  }
}
