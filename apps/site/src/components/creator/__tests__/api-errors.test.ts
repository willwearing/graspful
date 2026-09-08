import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClientFetch } from '@/lib/api-client';

vi.mock('@/lib/supabase/client', () => ({ createSupabaseBrowserClient: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe('creator API error details', () => {
  it.each([
    [{ message: 'Course needs authored teaching before publication.' }, 'Course needs authored teaching before publication.'],
    [{ message: ['Invalid question answer.', 'Course source is required.'] }, 'Invalid question answer.\nCourse source is required.'],
  ])('keeps server validation details available for correction', async (body, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 400 })));
    await expect(apiClientFetch('/orgs/my-org/courses/import', 'token')).rejects.toMatchObject({ statusCode: 400, message });
  });

  it('falls back to the HTTP status when an upstream response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Unavailable</html>', { status: 502, statusText: 'Bad Gateway' })));
    await expect(apiClientFetch('/brands', 'token')).rejects.toMatchObject({ statusCode: 502, message: 'API error: Bad Gateway' });
  });
});
