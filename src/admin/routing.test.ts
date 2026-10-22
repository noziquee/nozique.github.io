import { describe, expect, it } from 'vitest';
import { adminHref, parseAdminHash } from './routing';

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
