import { describe, expect, it } from 'vitest';
import { categoryKey, isAnimation } from './categories';
import { mapRows, safeId, safeUrl, type GroupRow, type ImageRow, type PostRow } from './mapping';

const group = (id: string, name: string, sort_order: number): GroupRow => ({
  id,
  name,
  sort_order,
  created_at: '2026-01-01T00:00:00Z',
});

const post = (over: Partial<PostRow>): PostRow => ({
  id: 'p1',
  title: 'A piece',
  description: null,
  group_id: null,
  sort_order: null,
  slug: null,
  year: null,
  tools: null,
  role: null,
  featured: false,
  aspect: '4/5',
  video_url: null,
  status: 'published',
  created_at: '2025-06-01T00:00:00Z',
  updated_at: '2025-06-01T00:00:00Z',
  ...over,
});

const image = (over: Partial<ImageRow>): ImageRow => ({
  id: 'i1',
  post_id: 'p1',
  url: 'https://example.com/a.png',
  alt: null,
  caption: null,
  sort_order: 0,
  created_at: '2025-06-01T00:00:00Z',
  ...over,
});

describe('categoryKey', () => {
  it('maps the starter categories to their keys', () => {
    expect(categoryKey('3D / Blender')).toBe('3d');
    expect(categoryKey('Character Design')).toBe('character');
    expect(categoryKey(' 2D Animation ')).toBe('anim2d');
  });
  it('makes a slug for custom categories', () => {
    expect(categoryKey('Concept Art!')).toBe('concept-art');
    expect(categoryKey('???')).toBe('other');
  });
  it('knows which categories are animations', () => {
    expect(isAnimation('anim3d')).toBe(true);
    expect(isAnimation('abstract')).toBe(false);
  });
});

describe('safeUrl', () => {
  it('only allows https links', () => {
    expect(safeUrl('https://x.test/a.png')).toBe('https://x.test/a.png');
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('http://x.test/a.png')).toBe('');
    expect(safeUrl(null)).toBe('');
  });
});

describe('mapRows', () => {
  const groups = [group('g2', '3D / Blender', 1), group('g1', 'Illustration', 0)];

  it('maps a post with images, category and defaults', () => {
    const data = mapRows(
      groups,
      [post({ group_id: 'g1', slug: 'my-piece', featured: true })],
      [
        image({ id: 'i2', url: 'https://example.com/b.png', sort_order: 1 }),
        image({ id: 'i1', url: 'https://example.com/a.png', sort_order: 0, alt: 'Alt' }),
      ],
    );
    const project = data.projects[0];
    expect(project?.id).toBe('my-piece');
    expect(project?.category).toBe('illustration');
    expect(project?.year).toBe(2025);
    expect(project?.featured).toBe(true);
    expect(project?.cover?.src).toBe('https://example.com/a.png');
    expect(project?.gallery.map((g) => g.src)).toEqual([
      'https://example.com/a.png',
      'https://example.com/b.png',
    ]);
    expect(data.source).toBe('database');
  });

  it('orders categories by sort order', () => {
    expect(mapRows(groups, [], []).categories.map((c) => c.key)).toEqual(['illustration', '3d']);
  });

  it('drops unsafe image links and falls back for a bad aspect', () => {
    const data = mapRows(
      groups,
      [post({ aspect: '9/9' })],
      [image({ url: 'javascript:alert(1)' })],
    );
    expect(data.projects[0]?.cover).toBeNull();
    expect(data.projects[0]?.aspect).toBe('4/5');
  });

  it('adds an Other category for projects without a category', () => {
    const data = mapRows(groups, [post({})], []);
    expect(data.categories.at(-1)).toEqual({ key: 'other', label: 'Other' });
  });
});

describe('safeId', () => {
  it('keeps plain slugs and falls back for anything that could break a link', () => {
    expect(safeId('my-piece-2', 'row-id')).toBe('my-piece-2');
    expect(safeId('a/b', 'row-id')).toBe('row-id');
    expect(safeId('<x>', 'row-id')).toBe('row-id');
    expect(safeId(null, 'row-id')).toBe('row-id');
    expect(safeId('  ', 'row-id')).toBe('row-id');
  });
});
