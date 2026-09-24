import { describe, expect, it, mock } from 'bun:test';
import { DEMO_COURSES, parseDemoCourse, readDemoCourse, seedDemoCourse } from '../seed-demo-config';

describe('demo course seed', () => {
  it.each(['electrical', 'javascript'] as const)('loads the %s fixture and seeds its matching org', async (course) => {
    expect(parseDemoCourse([course])).toBe(course);
    const yaml = readDemoCourse(course);
    expect(yaml).toContain('course:');
    const config = DEMO_COURSES[course];
    const org = { id: 'org-id', slug: config.slug };
    const organization = { upsert: mock(async () => org) };
    const subscription = { upsert: mock(async () => ({})) };
    const result = { courseId: 'course-id' };
    const importer = { importFromYaml: mock(async () => result) };
    await expect(seedDemoCourse(course, yaml,
      { organization, subscription } as unknown as Parameters<typeof seedDemoCourse>[2],
      importer as unknown as Parameters<typeof seedDemoCourse>[3],
    )).resolves.toEqual({ org, result });
    expect(organization.upsert).toHaveBeenCalledWith({
      where: { slug: config.slug }, update: { name: config.name, niche: config.niche },
      create: { slug: config.slug, name: config.name, niche: config.niche,
        settings: { domain: config.domain, brandId: config.brandId } },
    });
    expect(importer.importFromYaml).toHaveBeenCalledWith(yaml, 'org-id', { replace: true });
    expect(subscription.upsert).toHaveBeenCalledWith({
      where: { orgId: 'org-id' },
      update: { plan: 'free', status: 'active', maxMembers: 1000 },
      create: { orgId: 'org-id', stripeCustomerId: `cus_seed_${config.slug}`,
        plan: 'free', status: 'active', maxMembers: 1000 },
    });
  });

  it.each([[], ['unknown'], ['constructor'], ['electrical', 'javascript']].map((args) => ({ args })))('rejects invalid arguments $args', ({ args }) => {
    expect(() => parseDemoCourse(args)).toThrow('Usage:');
  });

  it('stops before subscription writes if import fails', async () => {
    const subscription = { upsert: mock() };
    const prisma = { organization: { upsert: mock(async () => ({ id: 'org', slug: 'electrician-prep' })) }, subscription };
    const importer = { importFromYaml: mock(async () => { throw new Error('Invalid course'); }) };
    await expect(seedDemoCourse('electrical', 'bad yaml',
      prisma as unknown as Parameters<typeof seedDemoCourse>[2],
      importer as unknown as Parameters<typeof seedDemoCourse>[3],
    )).rejects.toThrow('Invalid course');
    expect(subscription.upsert).not.toHaveBeenCalled();
  });
});
