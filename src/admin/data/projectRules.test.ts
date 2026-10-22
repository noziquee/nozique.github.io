import { describe, expect, it } from 'vitest';
import { EMPTY_FORM, hasErrors, sameForm, slugify, toRow, validateForm } from './projectRules';

const ok = { ...EMPTY_FORM, title: 'Orc Warrior' };

describe('validateForm', () => {
  it('accepts a title with defaults', () => {
    expect(hasErrors(validateForm(ok))).toBe(false);
  });
  it('requires a title', () => {
    expect(validateForm({ ...ok, title: '   ' }).title).toBeDefined();
  });
  it('limits the title length', () => {
    expect(validateForm({ ...ok, title: 'x'.repeat(121) }).title).toBeDefined();
  });
  it('accepts an empty year but rejects bad ones', () => {
    expect(validateForm({ ...ok, year: '' }).year).toBeUndefined();
    expect(validateForm({ ...ok, year: '24' }).year).toBeDefined();
    expect(validateForm({ ...ok, year: '1850' }).year).toBeDefined();
    expect(validateForm({ ...ok, year: 'abcd' }).year).toBeDefined();
  });
  it('rejects an unknown shape', () => {
    expect(validateForm({ ...ok, aspect: '9/1' }).aspect).toBeDefined();
  });
});

describe('toRow', () => {
  it('trims text and turns empty values into null', () => {
    const row = toRow({ ...ok, title: ' Orc ', year: '', description: '  ', groupId: '' });
    expect(row).toMatchObject({ title: 'Orc', year: null, description: null, group_id: null });
  });
  it('converts the year to a number', () => {
    expect(toRow({ ...ok, year: '2024' }).year).toBe(2024);
  });
});

describe('sameForm', () => {
  it('detects changes', () => {
    expect(sameForm(ok, { ...ok })).toBe(true);
    expect(sameForm(ok, { ...ok, role: 'x' })).toBe(false);
  });
});

describe('slugify', () => {
  it('makes a safe address from a title', () => {
    expect(slugify('Orc Warrior!')).toBe('orc-warrior');
    expect(slugify('Café  Sketch #2')).toBe('cafe-sketch-2');
  });
  it('falls back when nothing usable is left', () => {
    expect(slugify('???')).toBe('project');
  });
});
