import { Test, TestingModule } from '@nestjs/testing';
import { BrandsService } from './brands.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BrandsService', () => {
  let service: BrandsService;
  let prisma: {
    brand: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      brand: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  describe('findByDomain', () => {
    it('should return brand by domain', async () => {
      const mockBrand = {
        id: 'uuid',
        slug: 'firefighter',
        name: 'FirefighterPrep',
        domain: 'firefighterprep.vercel.app',
        isActive: true,
      };
      prisma.brand.findFirst.mockResolvedValue(mockBrand);

      const result = await service.findByDomain('firefighterprep.vercel.app');

      expect(result).toEqual(mockBrand);
      expect(prisma.brand.findFirst).toHaveBeenCalledWith({
        where: { domain: 'firefighterprep.vercel.app', isActive: true },
      });
    });

    it('should return null for unknown domain', async () => {
      prisma.brand.findFirst.mockResolvedValue(null);

      const result = await service.findByDomain('unknown.com');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return brand by slug', async () => {
      const mockBrand = {
        id: 'uuid',
        slug: 'firefighter',
        name: 'FirefighterPrep',
      };
      prisma.brand.findUnique.mockResolvedValue(mockBrand);

      const result = await service.findBySlug('firefighter');

      expect(result).toEqual(mockBrand);
      expect(prisma.brand.findUnique).toHaveBeenCalledWith({
        where: { slug: 'firefighter' },
      });
    });
  });

  describe('findAll', () => {
    it('should return all active brands ordered by name', async () => {
      const mockBrands = [
        { id: '1', name: 'Alpha', isActive: true },
        { id: '2', name: 'Beta', isActive: true },
      ];
      prisma.brand.findMany.mockResolvedValue(mockBrands);

      const result = await service.findAll();

      expect(result).toEqual(mockBrands);
      expect(prisma.brand.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  });
});
