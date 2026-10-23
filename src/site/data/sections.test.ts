import { describe, expect, it } from 'vitest';
import { loadSections, mapSections } from './sections';
import type { SectionRow } from './sections';

const design = {
  version: 1,
  layouts: {
    desktop: {
      width: 1200,
      height: 400,
      elements: [
        {
          id: 'title',
          type: 'text',
          position: { x: 10, y: 10 },
          size: { width: 400, height: 80 },
          content: { text: 'Hi' },
          style: { fontFamily: 'Archivo', fontSize: 40, color: '#ffffff' },
        },
      ],
    },
  },
};

const row = (over: Partial<SectionRow> = {}): SectionRow => ({
  section_key: 'hero',
  enabled: true,
  sort_order: 1,
  content: { design },
  ...over,
});

describe('mapSections', () => {
  it('reads a valid design from content.design', () => {
    const sections = mapSections([row()]);
    expect(sections['hero']).toMatchObject({ key: 'hero', enabled: true, sortOrder: 1 });
    expect(sections['hero']?.design?.layouts.desktop.elements).toHaveLength(1);
  });
  it('has no design for legacy content without one', () => {
    const sections = mapSections([row({ content: { heading: 'Old text' } })]);
    expect(sections['hero']?.design).toBeNull();
  });
  it('ignores an invalid design and reports it', () => {
    const problems: string[] = [];
    const bad = { ...design, version: 99 };
    const sections = mapSections([row({ content: { design: bad } })], (m) => problems.push(m));
    expect(sections['hero']?.design).toBeNull();
    expect(problems[0]).toContain('"hero" has an invalid design');
  });
  it('copes with content that is not an object', () => {
    for (const content of [null, 'text', 5, []]) {
      expect(mapSections([row({ content })])['hero']?.design).toBeNull();
    }
  });
  it('keeps the enabled flag', () => {
    expect(mapSections([row({ enabled: false })])['hero']?.enabled).toBe(false);
  });
});

describe('loadSections', () => {
  const clientWith = (result: unknown) =>
    ({
      from: () => ({ select: () => ({ order: () => Promise.resolve(result) }) }),
    }) as never;

  it('returns the sections from the database', async () => {
    const sections = await loadSections(() => clientWith({ data: [row()], error: null }));
    expect(sections['hero']?.design).not.toBeNull();
  });
  it('returns nothing when the database reports an error', async () => {
    const sections = await loadSections(() => clientWith({ data: null, error: { message: 'x' } }));
    expect(sections).toEqual({});
  });
  it('returns nothing when the client cannot be created', async () => {
    const sections = await loadSections(() => {
      throw new Error('Missing settings');
    });
    expect(sections).toEqual({});
  });
});
