import { describe, expect, it } from 'vitest';
import { createEmptyDesign } from '../../shared/design';
import { pickSectionDesign } from './sectionDesign';

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
