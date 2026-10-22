import { describe, expect, it } from 'vitest';
import { fitWithin, reorder, storagePathFromUrl, validateImageFile } from './imageRules';

describe('fitWithin', () => {
  it('shrinks the longer side to the limit and keeps the shape', () => {
    expect(fitWithin(4800, 2400, 2400)).toEqual({ width: 2400, height: 1200 });
    expect(fitWithin(2000, 4000, 2400)).toEqual({ width: 1200, height: 2400 });
  });
  it('never makes an image bigger', () => {
    expect(fitWithin(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });
});

describe('validateImageFile', () => {
  const file = { name: 'a.png', type: 'image/png', size: 1000 };
  it('accepts a normal image', () => {
    expect(validateImageFile(file)).toBeNull();
  });
  it('rejects other types', () => {
    expect(validateImageFile({ ...file, type: 'image/svg+xml' })).toContain('JPG, PNG and WebP');
    expect(validateImageFile({ ...file, type: 'application/pdf' })).not.toBeNull();
  });
  it('rejects huge files', () => {
    expect(validateImageFile({ ...file, size: 50 * 1024 * 1024 })).toContain('40 MB');
  });
});

describe('storagePathFromUrl', () => {
  const base = 'https://x.supabase.co/storage/v1/object/public/gallery-images/';
  it('finds the path in the gallery bucket', () => {
    expect(storagePathFromUrl(`${base}p1/a.webp`)).toBe('p1/a.webp');
    expect(storagePathFromUrl(`${base}p1/a%20b.webp?v=2`)).toBe('p1/a b.webp');
  });
  it('returns null for other buckets, other sites and odd paths', () => {
    const other = 'https://x.supabase.co/storage/v1/object/public/site-images/a.png';
    expect(storagePathFromUrl(other)).toBeNull();
    expect(storagePathFromUrl('https://example.com/a.png')).toBeNull();
    expect(storagePathFromUrl(`${base}../secret`)).toBeNull();
  });
});

describe('reorder', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  it('moves an item to a new place', () => {
    expect(reorder(list, 'a', 'c').map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(reorder(list, 'c', 'a').map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
  it('leaves the list alone for unknown ids', () => {
    expect(reorder(list, 'x', 'a')).toEqual(list);
  });
});
