import { describe, expect, it } from 'vitest';
import { createEmptyDesign } from '../../shared/design';
import { buildDraftContent, hasDesign, pickSectionDesign, withoutDesign } from './sectionDesign';

const live = { version: 1, layouts: { desktop: { width: 800, height: 300, elements: [] } } };
const draft = { version: 1, layouts: { desktop: { width: 900, height: 400, elements: [] } } };

function width(picked: ReturnType<typeof pickSectionDesign>): number | undefined {
  return picked.ok ? picked.design.layouts.desktop.width : undefined;
}

describe('pickSectionDesign', () => {
  it('uses the published design when there is no draft', () => {
    const picked = pickSectionDesign({ design: live }, null);
    expect(picked.source).toBe('published');
    expect(width(picked)).toBe(800);
  });

  it('prefers the draft over the published design', () => {
    const picked = pickSectionDesign({ design: live }, { design: draft });
    expect(picked.source).toBe('draft');
    expect(width(picked)).toBe(900);
  });

  it('starts blank when the section has no design', () => {
    for (const content of [{}, { text: 'hi' }, null, 'x', []]) {
      const picked = pickSectionDesign(content, undefined);
      expect(picked.source).toBe('none');
      expect(picked.ok && picked.design).toEqual(createEmptyDesign());
    }
  });

  it('reports a broken design instead of replacing it', () => {
    const picked = pickSectionDesign({ design: { version: 99 } }, null);
    expect(picked.ok).toBe(false);
    expect(!picked.ok && picked.errors.length).toBeGreaterThan(0);
  });

  it('reports a broken draft even when the live design is fine', () => {
    const picked = pickSectionDesign({ design: live }, { design: { nope: true } });
    expect(picked.ok).toBe(false);
    expect(picked.source).toBe('draft');
  });
});

describe('buildDraftContent', () => {
  it('puts the design into the existing content and keeps the rest', () => {
    const built = buildDraftContent({ title: 'Hi', design: draft }, live);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.content.title).toBe('Hi');
    expect(built.content.design).toEqual(live);
  });

  it('works when the content is empty or not an object', () => {
    for (const content of [null, undefined, 'x', [], {}]) {
      const built = buildDraftContent(content, live);
      expect(built.ok && Object.keys(built.content)).toEqual(['design']);
    }
  });

  it('refuses an invalid design', () => {
    const built = buildDraftContent({}, { version: 1, layouts: {} });
    expect(built.ok).toBe(false);
    expect(!built.ok && built.errors.length).toBeGreaterThan(0);
  });
});

describe('hasDesign and withoutDesign', () => {
  it('tell whether content holds a design and remove it', () => {
    expect(hasDesign({ design: live })).toBe(true);
    expect(hasDesign({})).toBe(false);
    expect(hasDesign(null)).toBe(false);
    expect(withoutDesign({ a: 1, design: live })).toEqual({ a: 1 });
    expect(withoutDesign('x')).toEqual({});
  });
});
