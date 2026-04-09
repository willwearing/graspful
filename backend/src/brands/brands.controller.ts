import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard, JwtOrApiKeyGuard } from '@/auth';
import { BrandsService } from './brands.service';
import { VercelDomainsService } from '@/shared/application/vercel-domains.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  private readonly logger = new Logger(BrandsController.name);

  constructor(
    private readonly brandsService: BrandsService,
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
  async create(@Body() dto: CreateBrandDto) {
    const brand = await this.brandsService.upsert(dto);

    // Provision the normalized domain on Vercel (brand.domain has the
    // canonical suffix applied by BrandsService, so always use that).
    const normalizedDomain = brand.domain;
    try {
      const vercelResult = await this.vercelDomainsService.addDomain(
        normalizedDomain,
      );
      const dnsInstructions =
        await this.vercelDomainsService.getDnsInstructions(normalizedDomain);
      return {
        brand,
        domain: {
          verified: vercelResult.verified,
          verification: vercelResult.verification,
          dnsInstructions,
        },
      };
    } catch (error) {
      this.logger.warn(
        `Domain provisioning failed for ${normalizedDomain}: ${error}`,
      );
      let dnsInstructions: { type: string; name: string; value: string } | null = null;
      try {
        dnsInstructions =
          await this.vercelDomainsService.getDnsInstructions(normalizedDomain);
      } catch {
        // DNS lookup also failed — return empty instructions
      }
      return {
        brand,
        domain: {
          verified: false,
          error: 'Domain provisioning failed. Configure DNS manually.',
          dnsInstructions,
        },
      };
    }
  }

  @Patch(':slug')
  @UseGuards(SupabaseAuthGuard)
  async update(@Param('slug') slug: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(slug, dto);
  }

  @Delete(':slug')
  @UseGuards(SupabaseAuthGuard)
  async delete(@Param('slug') slug: string) {
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
