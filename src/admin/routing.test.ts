import { describe, expect, it } from 'vitest';
import { adminHref, parseAdminHash, parseProjectRoute, projectHref } from './routing';

describe('parseAdminHash', () => {
  it('opens Projects by default', () => {
    expect(parseAdminHash('')).toBe('projects');
    expect(parseAdminHash('#/')).toBe('projects');
    expect(parseAdminHash('#/nope')).toBe('projects');
  });
  it('recognises each admin page', () => {
    expect(parseAdminHash('#/projects')).toBe('projects');
    expect(parseAdminHash('#/categories')).toBe('categories');
    expect(parseAdminHash('#/website')).toBe('website');
    expect(parseAdminHash('#/settings')).toBe('settings');
  });
  it('ignores anything after the page name', () => {
    expect(parseAdminHash('#/website/hero')).toBe('website');
  });
  it('round-trips with adminHref', () => {
    expect(parseAdminHash(adminHref('settings'))).toBe('settings');
  });
});

describe('parseProjectRoute', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  it('opens the editor for a new project', () => {
    expect(parseProjectRoute('#/projects/new')).toEqual({ kind: 'new' });
  });
  it('opens the editor for an existing project', () => {
    expect(parseProjectRoute(projectHref(id))).toEqual({ kind: 'edit', id });
  });
  it('returns null for the list and for anything else', () => {
    expect(parseProjectRoute('#/projects')).toBeNull();
    expect(parseProjectRoute('#/projects/not-an-id')).toBeNull();
    expect(parseProjectRoute('#/categories/new')).toBeNull();
  });
});
