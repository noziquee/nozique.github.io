import { describe, expect, it } from 'vitest';
import { changedOrders, isLiveSection, reorderSections } from './sectionRules';

function section(key: string, order: number, reorderable = true) {
  return { section_key: key, reorderable, sort_order: order };
}

const list = [
  section('header', 0, false),
  section('hero', 1),
  section('categories', 2),
  section('gallery', 3),
  section('footer', 4, false),
];

const keys = (items: { section_key: string }[]) => items.map((item) => item.section_key);

describe('reorderSections', () => {
  it('moves a section down and keeps header and footer in place', () => {
    const result = reorderSections(list, 'hero', 'gallery');
    expect(keys(result)).toEqual(['header', 'categories', 'gallery', 'hero', 'footer']);
  });

  it('moves a section up', () => {
    const result = reorderSections(list, 'gallery', 'hero');
    expect(keys(result)).toEqual(['header', 'gallery', 'hero', 'categories', 'footer']);
  });

  it('ignores pinned sections and unknown keys', () => {
    expect(keys(reorderSections(list, 'header', 'hero'))).toEqual(keys(list));
    expect(keys(reorderSections(list, 'hero', 'footer'))).toEqual(keys(list));
    expect(keys(reorderSections(list, 'nope', 'hero'))).toEqual(keys(list));
    expect(keys(reorderSections(list, 'hero', 'hero'))).toEqual(keys(list));
  });

  it('does not change the original list', () => {
    reorderSections(list, 'hero', 'gallery');
    expect(keys(list)).toEqual(['header', 'hero', 'categories', 'gallery', 'footer']);
  });
});

describe('changedOrders', () => {
  it('lists only the sections whose number changed', () => {
    const after = reorderSections(list, 'hero', 'categories');
    expect(changedOrders(list, after)).toEqual([
      { key: 'categories', sortOrder: 1 },
      { key: 'hero', sortOrder: 2 },
    ]);
  });

  it('is empty when nothing moved', () => {
    expect(changedOrders(list, list)).toEqual([]);
  });
});

describe('isLiveSection', () => {
  it('knows which sections the public site obeys', () => {
    expect(isLiveSection('hero')).toBe(true);
    expect(isLiveSection('gallery')).toBe(true);
    expect(isLiveSection('somethingNew')).toBe(false);
  });
});
