import { describe, expect, it } from 'vitest';
import { pageTitle, parseHash, toHash } from './route';

const ids = ['character-01', 'portrait-01'];

describe('parseHash', () => {
  it('treats empty and root hashes as home', () => {
    expect(parseHash('')).toEqual({ page: 'home' });
    expect(parseHash('#/')).toEqual({ page: 'home' });
    expect(parseHash('#')).toEqual({ page: 'home' });
  });
  it('recognises the main pages', () => {
    expect(parseHash('#/work')).toEqual({ page: 'work' });
    expect(parseHash('#/about')).toEqual({ page: 'about' });
    expect(parseHash('#/contact')).toEqual({ page: 'contact' });
  });
  it('recognises a project page only for a known id', () => {
    expect(parseHash('#/work/character-01', ids)).toEqual({ page: 'work', id: 'character-01' });
    expect(parseHash('#/work/nope', ids)).toEqual({ page: 'work' });
    expect(parseHash('#/work/character-01')).toEqual({ page: 'work' });
  });
  it('ignores ids on pages that do not take one', () => {
    expect(parseHash('#/about/character-01', ids)).toEqual({ page: 'about' });
  });
  it('falls back to home for unknown pages', () => {
    expect(parseHash('#/nope')).toEqual({ page: 'home' });
    expect(parseHash('#work')).toEqual({ page: 'home' });
  });
});

describe('toHash', () => {
  it('round-trips with parseHash', () => {
    for (const hash of ['#/', '#/work', '#/about', '#/contact', '#/work/portrait-01']) {
      expect(toHash(parseHash(hash, ids))).toBe(hash);
    }
  });
});

describe('pageTitle', () => {
  it('names each page', () => {
    expect(pageTitle({ page: 'home' })).toBe('Illustration, 3D and Animation | Nozique');
    expect(pageTitle({ page: 'work' })).toBe('Work | Nozique');
    expect(pageTitle({ page: 'contact' })).toBe('Contact | Nozique');
  });
  it('uses the project title on a project page', () => {
    expect(pageTitle({ page: 'work', id: 'a' }, 'My Piece')).toBe('My Piece | Nozique');
  });
});
