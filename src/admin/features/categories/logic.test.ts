import { describe, expect, it } from 'vitest';
import { moveById, nextSortOrder, validateCategoryName } from './logic';

const list = [
  { id: 'a', name: 'Illustration' },
  { id: 'b', name: '3D / Blender' },
  { id: 'c', name: 'Animation' },
];

describe('validateCategoryName', () => {
  it('accepts a fresh name', () => {
    expect(validateCategoryName('Sketches', list)).toBeNull();
  });
  it('rejects empty and overlong names', () => {
    expect(validateCategoryName('   ', list)).toMatch(/Enter a name/);
    expect(validateCategoryName('x'.repeat(81), list)).toMatch(/under 80/);
  });
  it('rejects a duplicate ignoring case and spaces', () => {
    expect(validateCategoryName('  illustration ', list)).toMatch(/already exists/);
  });
  it('lets a category keep its own name when renaming', () => {
    expect(validateCategoryName('Illustration', list, 'a')).toBeNull();
  });
});

describe('nextSortOrder', () => {
  it('starts at 0 for an empty list', () => {
    expect(nextSortOrder([])).toBe(0);
  });
  it('goes one past the highest number and ignores empty values', () => {
    expect(nextSortOrder([{ sort_order: 0 }, { sort_order: 4 }, { sort_order: null }])).toBe(5);
  });
});

describe('moveById', () => {
  it('moves an item forward and backward', () => {
    expect(moveById(list, 'a', 'c').map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(moveById(list, 'c', 'a').map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });
  it('returns an unchanged copy for unknown or identical ids', () => {
    expect(moveById(list, 'a', 'a')).toEqual(list);
    expect(moveById(list, 'zzz', 'a')).toEqual(list);
    expect(moveById(list, 'a', 'a')).not.toBe(list);
  });
});
