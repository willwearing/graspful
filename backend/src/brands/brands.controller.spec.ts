import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BrandAccessService } from './brand-access.service';
import { VercelDomainsService } from '@/shared/application/vercel-domains.service';
import { SupabaseAuthGuard, JwtOrApiKeyGuard } from '@/auth';
import type { AuthUser } from '@/auth';
import type { CreateBrandDto } from './dto/create-brand.dto';

/**
 * Regression tests for the brand authorization boundary.
 *
 * Before this was added, POST /brands and DELETE /brands/:slug required only a
 * valid token, so any signed-up user could overwrite or deactivate any tenant's
 * brand by slug.
 */
describe('BrandsController authorization', () => {
  let controller: BrandsController;
  let brandsService: {
    upsert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let brandAccess: {
    assertCanManageOrg: jest.Mock;
    assertCanManageBrand: jest.Mock;
    assertSlugAvailableToOrg: jest.Mock;
  };
  let vercel: { addDomain: jest.Mock; getDnsInstructions: jest.Mock };

  const attacker: AuthUser = { userId: 'attacker', email: 'attacker@evil.test' };

  const dto = {
    slug: 'victim-brand',
    name: 'Pwned',
    domain: 'evil.example.com',
    tagline: 'x',
    orgSlug: 'victim-org',
    theme: {},
    landing: {},
    seo: {},
  } as CreateBrandDto;

  beforeEach(async () => {
    brandsService = {
      upsert: jest.fn().mockResolvedValue({ slug: 'victim-brand', domain: 'd' }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    };
    brandAccess = {
      assertCanManageOrg: jest.fn().mockResolvedValue(undefined),
      assertCanManageBrand: jest.fn().mockResolvedValue('victim-org'),
      assertSlugAvailableToOrg: jest.fn().mockResolvedValue(undefined),
    };
    vercel = {
      addDomain: jest.fn().mockResolvedValue({ verified: true }),
      getDnsInstructions: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrandsController],
      providers: [
        { provide: BrandsService, useValue: brandsService },
        { provide: BrandAccessService, useValue: brandAccess },
        { provide: VercelDomainsService, useValue: vercel },
      ],
    })
      // Authentication is exercised elsewhere; these tests cover the
      // authorization checks that run after a caller is authenticated.
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtOrApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BrandsController>(BrandsController);
  });

  describe('POST /brands', () => {
    it('checks org rights and slug ownership before writing', async () => {
      await controller.create(dto, attacker);

      expect(brandAccess.assertCanManageOrg).toHaveBeenCalledWith(
        'attacker',
        'victim-org',
      );
      expect(brandAccess.assertSlugAvailableToOrg).toHaveBeenCalledWith(
        'victim-brand',
        'victim-org',
      );
      expect(brandsService.upsert).toHaveBeenCalled();
    });

    it('does not write or provision a domain when the org check fails', async () => {
      brandAccess.assertCanManageOrg.mockRejectedValue(new ForbiddenException());

      await expect(controller.create(dto, attacker)).rejects.toThrow(
        ForbiddenException,
      );

      expect(brandsService.upsert).not.toHaveBeenCalled();
      expect(vercel.addDomain).not.toHaveBeenCalled();
    });

    it('does not write when the slug belongs to another org', async () => {
      brandAccess.assertSlugAvailableToOrg.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(controller.create(dto, attacker)).rejects.toThrow(
        ForbiddenException,
      );

      expect(brandsService.upsert).not.toHaveBeenCalled();
      expect(vercel.addDomain).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /brands/:slug', () => {
    it('checks brand ownership before deactivating', async () => {
      await controller.delete('victim-brand', attacker);

      expect(brandAccess.assertCanManageBrand).toHaveBeenCalledWith(
        'attacker',
        'victim-brand',
      );
      expect(brandsService.delete).toHaveBeenCalledWith('victim-brand');
    });

    it('does not deactivate when the caller does not own the brand', async () => {
      brandAccess.assertCanManageBrand.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        controller.delete('victim-brand', attacker),
      ).rejects.toThrow(ForbiddenException);

      expect(brandsService.delete).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /brands/:slug', () => {
    it('checks brand ownership before updating', async () => {
      await controller.update('victim-brand', { name: 'x' }, attacker);

      expect(brandAccess.assertCanManageBrand).toHaveBeenCalledWith(
        'attacker',
        'victim-brand',
      );
      expect(brandsService.update).toHaveBeenCalled();
    });

    it('does not update when the caller does not own the brand', async () => {
      brandAccess.assertCanManageBrand.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        controller.update('victim-brand', { name: 'x' }, attacker),
      ).rejects.toThrow(ForbiddenException);

      expect(brandsService.update).not.toHaveBeenCalled();
    });
  });
});
