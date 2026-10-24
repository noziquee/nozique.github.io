import { describe, expect, it } from 'vitest';
import { NO_FILTERS, filterProjects, hasFilters, reorderWithinVisible } from './projectFilter';

const items = [
  { title: 'Orc Warrior', status: 'published', group_id: 'a' },
  { title: 'Portrait', status: 'draft', group_id: 'a' },
  { title: 'Loose sketch', status: 'draft', group_id: null },
];

describe('filterProjects', () => {
  it('returns everything with no filters', () => {
    expect(filterProjects(items, NO_FILTERS)).toHaveLength(3);
  });
  it('filters by status', () => {
    expect(filterProjects(items, { ...NO_FILTERS, status: 'draft' })).toHaveLength(2);
  });
  it('filters by category and by "no category"', () => {
    expect(filterProjects(items, { ...NO_FILTERS, category: 'a' })).toHaveLength(2);
    expect(filterProjects(items, { ...NO_FILTERS, category: 'none' })).toEqual([items[2]]);
  });
  it('searches titles ignoring case and extra spaces', () => {
    expect(filterProjects(items, { ...NO_FILTERS, search: '  ORC ' })).toEqual([items[0]]);
  });
  it('combines filters', () => {
    const f = { category: 'a', status: 'draft' as const, search: 'port' };
    expect(filterProjects(items, f)).toEqual([items[1]]);
  });
  it('knows when filters are active', () => {
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, search: 'x' })).toBe(true);
  });
});

describe('reorderWithinVisible', () => {
  const all = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
  const ids = (list: { id: string }[]) => list.map((item) => item.id);

  it('reorders everything when all are visible', () => {
    expect(ids(reorderWithinVisible(all, all, 'a', 'c'))).toEqual(['b', 'c', 'a', 'd', 'e']);
  });
  it('only moves the visible ones and keeps the others in place', () => {
    const visible = [all[0], all[2], all[4]] as { id: string }[]; // a, c, e
    expect(ids(reorderWithinVisible(all, visible, 'e', 'a'))).toEqual(['e', 'b', 'a', 'd', 'c']);
  });
  it('changes nothing for unknown ids or the same place', () => {
    expect(ids(reorderWithinVisible(all, all, 'x', 'a'))).toEqual(ids(all));
    expect(ids(reorderWithinVisible(all, all, 'a', 'a'))).toEqual(ids(all));
  });
});
