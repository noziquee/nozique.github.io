import { describe, expect, it } from 'vitest';
import {
  CURRENT_DESIGN_VERSION,
  createEmptyDesign,
  loadDesign,
  migrateDesign,
  parseDesign,
} from '.';
import type { Migration } from '.';

const text = (over: Record<string, unknown> = {}) => ({
  id: 'title',
  type: 'text',
  position: { x: 10, y: 20 },
  size: { width: 300, height: 60 },
  content: { text: 'Hello' },
  style: { fontFamily: 'var(--font-display)', fontSize: 48, color: '#e8281e' },
  ...over,
});

const shape = (over: Record<string, unknown> = {}) => ({
  id: 'box',
  type: 'shape',
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  style: { fill: 'var(--red)' },
  ...over,
});

const picture = (over: Record<string, unknown> = {}) => ({
  id: 'pic',
  type: 'image',
  position: { x: 0, y: 0 },
  size: { width: 200, height: 150 },
  content: { src: 'https://example.com/a.webp', alt: 'A drawing' },
  style: {},
  ...over,
});

const design = (elements: unknown[] = [text(), shape()]) => ({
  version: 1,
  layouts: { desktop: { width: 1200, height: 600, elements } },
});

function errorsOf(raw: unknown): string[] {
  const result = parseDesign(raw);
  return result.ok ? [] : result.errors;
}

describe('parseDesign: good designs', () => {
  it('accepts a design with a text and a shape', () => {
    expect(parseDesign(design()).ok).toBe(true);
  });
  it('fills in defaults for rotation, opacity, visibility and text style', () => {
    const result = parseDesign(design());
    if (!result.ok) throw new Error('expected a valid design');
    const [first] = result.design.layouts.desktop.elements;
    expect(first).toMatchObject({ rotation: 0, opacity: 1, hidden: false, locked: false });
    expect(first?.type === 'text' && first.style).toMatchObject({
      fontWeight: 400,
      italic: false,
      align: 'left',
      lineHeight: 1.2,
    });
  });
  it('accepts an optional phone layout', () => {
    const raw = design();
    const withPhone = {
      ...raw,
      layouts: { ...raw.layouts, mobile: { width: 390, height: 800, elements: [shape()] } },
    };
    expect(parseDesign(withPhone).ok).toBe(true);
  });
  it('accepts the empty design', () => {
    expect(parseDesign(createEmptyDesign()).ok).toBe(true);
  });
});

describe('parseDesign: bad designs', () => {
  it('rejects an unknown element type', () => {
    expect(errorsOf(design([{ ...shape(), type: 'hologram' }])).length).toBeGreaterThan(0);
  });
  it('rejects colours that could carry CSS', () => {
    const bad = shape({ style: { fill: 'url(https://evil.example/x.png)' } });
    expect(errorsOf(design([bad])).join(' ')).toContain('colour');
    expect(errorsOf(design([shape({ style: { fill: 'red; position: fixed' } })]))).not.toEqual([]);
  });
  it('accepts hex, rgb and token colours', () => {
    const fills = ['#fff', '#e8281e', '#e8281e80', 'rgb(0, 0, 0)', 'rgba(0,0,0,0.5)', 'var(--red)'];
    for (const fill of fills) {
      expect(parseDesign(design([shape({ style: { fill } })])).ok).toBe(true);
    }
  });
  it('rejects unsafe ids and duplicate ids', () => {
    expect(errorsOf(design([shape({ id: 'a b"><script>' })])).join(' ')).toContain('id');
    const twice = errorsOf(design([shape({ id: 'x' }), text({ id: 'x' })]));
    expect(twice.join(' ')).toContain('more than once');
  });
  it('rejects numbers that are out of range or not numbers', () => {
    expect(errorsOf(design([text({ style: { ...text().style, fontSize: 0 } })]))).not.toEqual([]);
    expect(errorsOf(design([shape({ size: { width: -5, height: 10 } })]))).not.toEqual([]);
    expect(errorsOf(design([shape({ rotation: Number.NaN })]))).not.toEqual([]);
    expect(errorsOf(design([shape({ opacity: 2 })]))).not.toEqual([]);
  });
  it('rejects unknown properties instead of keeping them', () => {
    expect(errorsOf(design([shape({ onclick: 'alert(1)' })]))).not.toEqual([]);
  });
  it('rejects too many elements and over-long text', () => {
    const many = Array.from({ length: 501 }, (_, i) => shape({ id: `s${i}` }));
    expect(errorsOf(design(many)).join(' ')).toContain('at most 500');
    const long = text({ content: { text: 'x'.repeat(5001) } });
    expect(errorsOf(design([long]))).not.toEqual([]);
  });
  it('names where the problem is', () => {
    const errors = errorsOf(design([shape({ opacity: 5 })]));
    expect(errors[0]).toContain('layouts.desktop.elements.0.opacity');
  });
  it('rejects things that are not designs at all', () => {
    for (const raw of [null, 'text', 42, [], {}]) expect(parseDesign(raw).ok).toBe(false);
  });
});

describe('image elements', () => {
  it('accepts an https picture and fills in the crop defaults', () => {
    const result = parseDesign(design([picture()]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [element] = result.design.layouts.desktop.elements;
    expect(element?.type === 'image' && element.style).toEqual({
      fit: 'cover',
      radius: 0,
      focusX: 50,
      focusY: 50,
      zoom: 1,
    });
  });
  it('rejects addresses that are not plain https', () => {
    const bad = [
      'http://example.com/a.png',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '//example.com/a.png',
      'not a url',
      `https://example.com/${'a'.repeat(2000)}`,
    ];
    for (const src of bad) {
      expect(errorsOf(design([picture({ content: { src, alt: '' } })])), src).not.toEqual([]);
    }
  });
  it('rejects crop values out of range and unknown properties', () => {
    expect(errorsOf(design([picture({ style: { zoom: 9 } })]))).not.toEqual([]);
    expect(errorsOf(design([picture({ style: { focusX: 120 } })]))).not.toEqual([]);
    expect(errorsOf(design([picture({ style: { fit: 'stretch' } })]))).not.toEqual([]);
    expect(errorsOf(design([picture({ style: { onload: 'x' } })]))).not.toEqual([]);
  });
  it('allows an empty alt text (a decorative picture) but not an over-long one', () => {
    const quiet = picture({ content: { src: 'https://a.example/x.png', alt: '' } });
    expect(parseDesign(design([quiet])).ok).toBe(true);
    const long = picture({ content: { src: 'https://a.example/x.png', alt: 'x'.repeat(301) } });
    expect(errorsOf(design([long]))).not.toEqual([]);
  });
});

describe('loadDesign and versions', () => {
  it('loads a current design without a migration', () => {
    const result = loadDesign(design());
    expect(result.ok && result.migratedFrom).toBe(null);
  });
  it('rejects a missing or invalid version', () => {
    expect(loadDesign({ layouts: {} }).ok).toBe(false);
    expect(loadDesign({ ...design(), version: 'one' }).ok).toBe(false);
    expect(loadDesign({ ...design(), version: 0 }).ok).toBe(false);
  });
  it('rejects a design from a newer editor', () => {
    const result = loadDesign({ ...design(), version: CURRENT_DESIGN_VERSION + 1 });
    expect(!result.ok && result.errors.join(' ')).toContain('newer version');
  });
});

describe('migrateDesign', () => {
  const addNote: Migration = (old) => ({ ...old, version: 2, note: 'v2' });
  const addMore: Migration = (old) => ({ ...old, version: 3, more: true });

  it('runs each step in order up to the current version', () => {
    const result = migrateDesign({ version: 1 }, { 1: addNote, 2: addMore }, 3);
    expect(result).toEqual({ ok: true, from: 1, raw: { version: 3, note: 'v2', more: true } });
  });
  it('starts from the design’s own version', () => {
    const result = migrateDesign({ version: 2 }, { 1: addNote, 2: addMore }, 3);
    expect(result.ok && result.raw).toEqual({ version: 3, more: true });
  });
  it('fails clearly when a step is missing', () => {
    const result = migrateDesign({ version: 1 }, {}, 2);
    expect(!result.ok && result.error).toContain('no upgrade from design version 1');
  });
  it('fails when a step forgets to raise the version', () => {
    const lazy: Migration = (old) => ({ ...old });
    const result = migrateDesign({ version: 1 }, { 1: lazy }, 2);
    expect(result.ok).toBe(false);
  });
  it('does nothing for a design that is already current', () => {
    expect(migrateDesign({ version: 2, a: 1 }, {}, 2)).toEqual({
      ok: true,
      from: 2,
      raw: { version: 2, a: 1 },
    });
  });
});
