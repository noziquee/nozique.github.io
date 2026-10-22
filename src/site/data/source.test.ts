import { describe, expect, it } from 'vitest';
import type { NoziqueClient } from '../../shared/supabase/client';
import { fetchSiteData, loadSiteData } from './source';

type Rows = Record<string, unknown[]>;

/** A tiny stand-in for the Supabase client: every query resolves with the given rows. */
function fakeClient(rows: Rows, error: string | null = null): Pick<NoziqueClient, 'from'> {
  const from = (table: string) => {
    const query = {
      select: () => query,
      eq: () => query,
      order: () => query,
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(
          error
            ? { data: null, error: { message: error } }
            : { data: rows[table] ?? [], error: null },
        ).then(resolve),
    };
    return query;
  };
  return { from } as unknown as Pick<NoziqueClient, 'from'>;
}

const aPost = {
  id: 'p1',
  title: 'Real piece',
  description: null,
  group_id: null,
  sort_order: null,
  slug: null,
  year: 2026,
  tools: null,
  role: null,
  featured: false,
  aspect: '4/5',
  video_url: null,
  status: 'published',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('loadSiteData', () => {
  it('uses database projects when there are some', async () => {
    const data = await loadSiteData(() =>
      fakeClient({ groups: [], posts: [aPost], post_images: [] }),
    );
    expect(data.source).toBe('database');
    expect(data.projects.map((p) => p.title)).toEqual(['Real piece']);
  });

  it('falls back to the placeholders when the database is empty', async () => {
    const data = await loadSiteData(() => fakeClient({}));
    expect(data.source).toBe('placeholder');
    expect(data.projects.length).toBeGreaterThanOrEqual(8);
    expect(data.categories).toHaveLength(5);
  });

  it('falls back when the database reports an error', async () => {
    const data = await loadSiteData(() => fakeClient({}, 'boom'));
    expect(data.source).toBe('placeholder');
  });

  it('falls back when the client cannot be created (missing settings)', async () => {
    const data = await loadSiteData(() => {
      throw new Error('Missing VITE_SUPABASE_URL');
    });
    expect(data.source).toBe('placeholder');
  });

  it('falls back when the database is too slow', async () => {
    const slow = { from: () => new Promise(() => {}) } as unknown as Pick<NoziqueClient, 'from'>;
    const data = await loadSiteData(() => slow, 20);
    expect(data.source).toBe('placeholder');
  });
});

describe('fetchSiteData', () => {
  it('throws when the database reports an error', async () => {
    await expect(fetchSiteData(fakeClient({}, 'denied'))).rejects.toThrow('denied');
  });
});
