import { describe, expect, it } from 'vitest';
import { cleanGroupName, isDuplicateName, nextSortOrder } from './groupRules';

describe('cleanGroupName', () => {
  it('trims and collapses spaces', () => {
    expect(cleanGroupName('  Concept   Art ')).toEqual({ ok: true, name: 'Concept Art' });
  });
  it('rejects empty names', () => {
    expect(cleanGroupName('   ')).toEqual({ ok: false, error: 'Enter a name.' });
  });
  it('rejects names over 80 characters', () => {
    expect(cleanGroupName('x'.repeat(81)).ok).toBe(false);
    expect(cleanGroupName('x'.repeat(80)).ok).toBe(true);
  });
});

describe('isDuplicateName', () => {
  const groups = [
    { id: 'a', name: 'Illustration' },
    { id: 'b', name: '3D / Blender' },
  ];
  it('ignores case', () => {
    expect(isDuplicateName('illustration', groups)).toBe(true);
    expect(isDuplicateName('Sketches', groups)).toBe(false);
  });
  it('lets a category keep its own name', () => {
    expect(isDuplicateName('Illustration', groups, 'a')).toBe(false);
  });
});

describe('nextSortOrder', () => {
  it('goes one past the highest', () => {
    expect(nextSortOrder([{ sort_order: 0 }, { sort_order: 4 }, { sort_order: null }])).toBe(5);
  });
  it('starts at 0 for an empty list', () => {
    expect(nextSortOrder([])).toBe(0);
  });
});
