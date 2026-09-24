import { createHash } from 'crypto';
import { ApiKeyService } from './api-key.service';

function setup() {
  const prisma = {
    apiKey: {
      create: jest.fn().mockResolvedValue({ id: 'key-1' }),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const service = new ApiKeyService(prisma as any);
  return { service, prisma };
}

const now = new Date('2026-09-24T12:00:00.000Z');
const rawKey = `gsk_${'ab'.repeat(32)}`;
const storedKey = {
  id: 'key-1',
  orgId: 'org-1',
  userId: 'user-1',
  org: { id: 'org-1', isActive: true },
  user: { id: 'user-1' },
  expiresAt: null,
};

describe('ApiKeyService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns a high-entropy secret once and persists its hash and limited prefix', async () => {
    const { service, prisma } = setup();

    const first = await service.createKey('org-1', 'user-1', 'CLI');
    const second = await service.createKey('org-1', 'user-1', 'CLI');

    expect(first).toEqual({ id: 'key-1', key: expect.stringMatching(/^gsk_[a-f0-9]{64}$/) });
    expect(second.key).not.toBe(first.key);
    const data = prisma.apiKey.create.mock.calls[0][0].data;
    expect(data).toEqual({
      orgId: 'org-1',
      userId: 'user-1',
      name: 'CLI',
      keyHash: createHash('sha256').update(first.key).digest('hex'),
      keyPrefix: first.key.slice(0, 12),
    });
    expect(JSON.stringify(data)).not.toContain(first.key);
  });

  it('looks up only the hash and returns the stored organization scope', async () => {
    const { service, prisma } = setup();
    prisma.apiKey.findUnique.mockResolvedValue(storedKey);

    await expect(service.validateKey(rawKey)).resolves.toEqual(storedKey);

    const lookup = prisma.apiKey.findUnique.mock.calls[0][0];
    expect(lookup.where).toEqual({ keyHash: createHash('sha256').update(rawKey).digest('hex') });
    expect(JSON.stringify(lookup)).not.toContain(rawKey);
    expect(prisma.apiKey.update).toHaveBeenCalledWith({
      where: { id: storedKey.id },
      data: { lastUsedAt: now },
    });
  });

  it('rejects an unknown or revoked key and does not record usage', async () => {
    const { service, prisma } = setup();
    prisma.apiKey.findUnique.mockResolvedValue(null);

    await expect(service.validateKey(rawKey)).resolves.toBeNull();

    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('rejects expired keys and does not record usage', async () => {
    const { service, prisma } = setup();
    prisma.apiKey.findUnique.mockResolvedValue({ ...storedKey, expiresAt: new Date(now.getTime() - 1) });

    await expect(service.validateKey(rawKey)).resolves.toBeNull();

    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('rejects a key at its exact expiration time', async () => {
    const { service, prisma } = setup();
    prisma.apiKey.findUnique.mockResolvedValue({ ...storedKey, expiresAt: now });

    await expect(service.validateKey(rawKey)).resolves.toBeNull();

    expect(prisma.apiKey.update).not.toHaveBeenCalled();
  });

  it('accepts a key before its expiry', async () => {
    const { service, prisma } = setup();
    const key = { ...storedKey, expiresAt: new Date(now.getTime() + 1) };
    prisma.apiKey.findUnique.mockResolvedValue(key);

    await expect(service.validateKey(rawKey)).resolves.toEqual(key);
  });

  it('does not wait for a usage timestamp write before returning an authenticated key', async () => {
    const { service, prisma } = setup();
    prisma.apiKey.findUnique.mockResolvedValue(storedKey);
    prisma.apiKey.update.mockImplementation(() => new Promise(() => {}));

    await expect(service.validateKey(rawKey)).resolves.toEqual(storedKey);
  });

  it('keeps authentication available when the usage timestamp cannot be updated', async () => {
    const { service, prisma } = setup();
    prisma.apiKey.findUnique.mockResolvedValue(storedKey);
    prisma.apiKey.update.mockRejectedValue(new Error('Write unavailable'));
    const warning = jest.spyOn(service['logger'], 'warn').mockImplementation();

    await expect(service.validateKey(rawKey)).resolves.toEqual(storedKey);

    expect(warning).toHaveBeenCalled();
  });

  it('lists metadata only for the selected organization and excludes secret hashes', async () => {
    const { service, prisma } = setup();
    const metadata = [{ id: 'key-1', name: 'CLI', keyPrefix: 'gsk_abababab' }];
    prisma.apiKey.findMany.mockResolvedValue(metadata);

    await expect(service.listKeys('org-1')).resolves.toEqual(metadata);

    const query = prisma.apiKey.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ orgId: 'org-1' });
    expect(Object.keys(query.select).sort()).toEqual([
      'createdAt', 'expiresAt', 'id', 'keyPrefix', 'lastUsedAt', 'name',
    ]);
    expect(Object.values(query.select).every(Boolean)).toBe(true);
  });

  it('restricts revocation to both the key and its organization', async () => {
    const { service, prisma } = setup();

    await service.revokeKey('key-from-another-org', 'org-1');

    expect(prisma.apiKey.deleteMany).toHaveBeenCalledWith({
      where: { id: 'key-from-another-org', orgId: 'org-1' },
    });
  });

  it('makes revocation idempotent when a scoped key no longer exists', async () => {
    const { service, prisma } = setup();
    prisma.apiKey.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.revokeKey('missing-key', 'org-1')).resolves.toBeUndefined();
  });
});
