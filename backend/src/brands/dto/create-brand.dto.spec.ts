import { validate } from 'class-validator';
import { CreateBrandDto } from './create-brand.dto';

function buildValidDto(): CreateBrandDto {
  const dto = new CreateBrandDto();
  Object.assign(dto, {
    slug: 'test-brand',
    name: 'Test Brand',
    domain: 'test.graspful.com',
    tagline: 'Learn better',
    logoUrl: '/logo.svg',
    orgSlug: 'test-org',
    theme: { primaryColor: '#000' },
    landing: { hero: 'Welcome' },
    seo: { title: 'Test' },
    pricing: { free: true },
  });
  return dto;
}

describe('CreateBrandDto', () => {
  it('should pass validation with all required fields', async () => {
    const dto = buildValidDto();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when slug is missing', async () => {
    const dto = buildValidDto();
    delete (dto as any).slug;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'slug')).toBe(true);
  });

  it('should fail validation when name is missing', async () => {
    const dto = buildValidDto();
    delete (dto as any).name;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('should fail validation when domain is missing', async () => {
    const dto = buildValidDto();
    delete (dto as any).domain;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'domain')).toBe(true);
  });

  it('should fail validation when orgSlug is missing', async () => {
    const dto = buildValidDto();
    delete (dto as any).orgSlug;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'orgSlug')).toBe(true);
  });

  it('should fail validation with nested { brand: {...} } shape (no top-level fields)', async () => {
    const dto = new CreateBrandDto();
    Object.assign(dto, {
      brand: {
        slug: 'test-brand',
        name: 'Test Brand',
        domain: 'test.graspful.com',
        orgSlug: 'test-org',
      },
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
