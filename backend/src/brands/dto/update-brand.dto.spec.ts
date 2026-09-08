import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateBrandDto } from './update-brand.dto';

describe('brand settings HTTP contract', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });
  const validate = (value: unknown) => pipe.transform(value, { type: 'body', metatype: UpdateBrandDto });

  it('accepts every editable field through the production validation pipe', async () => {
    const settings = {
      name: 'Safety academy', tagline: 'Practice safety procedures',
      logoUrl: '/logo.svg', faviconUrl: '/favicon.ico', ogImageUrl: '/preview.png',
      theme: { preset: 'indigo' },
      landing: { features: { items: [] }, howItWorks: { items: [] } },
      seo: { title: 'Safety academy' }, pricing: {},
      contentScope: { courseIds: ['safety'] }, isActive: true,
    };
    await expect(validate(settings)).resolves.toEqual(settings);
  });

  it.each([
    { theme: 'blue' }, { landing: [] }, { name: 42 }, { isActive: 'yes' },
    { orgSlug: 'another-org' }, { slug: 'another-brand' }, { domain: 'another.example' },
  ])('rejects invalid or protected settings: %j', async (settings) => {
    await expect(validate(settings)).rejects.toBeInstanceOf(BadRequestException);
  });
});
