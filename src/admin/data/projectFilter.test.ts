import { describe, expect, it } from 'vitest';
import { NO_FILTERS, filterProjects, hasFilters } from './projectFilter';

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
