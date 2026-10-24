import { describe, expect, it } from 'vitest';
import { parseDesign } from '../../shared/design';
import type { Design } from '../../shared/design';
import { LIMITS, createEmptyDesign } from '../../shared/design';
import {
  addElement,
  canStep,
  deleteElement,
  findElement,
  moveElementOnto,
  stepElement,
  uniqueId,
  updateElement,
} from './designOps';

function shape(id: string, at: number, size: number, fill: string) {
  return {
    id,
    type: 'shape',
    position: { x: at, y: at },
    size: { width: size, height: size },
    style: { fill },
  };
}

const raw = {
  version: 1,
  layouts: {
    desktop: {
      width: 800,
      height: 400,
      elements: [shape('a', 0, 10, '#fff'), shape('b', 5, 20, '#000')],
    },
  },
};

function load(): Design {
  const result = parseDesign(raw);
  if (!result.ok) throw new Error('bad test design');
  return result.design;
}

describe('updateElement', () => {
  it('changes only the chosen element', () => {
    const design = load();
    const next = updateElement(design, 'a', { position: { x: 50, y: 60 }, rotation: 15 });
    expect(findElement(next, 'a')).toMatchObject({ position: { x: 50, y: 60 }, rotation: 15 });
    expect(findElement(next, 'b')).toEqual(findElement(design, 'b'));
  });

  it('does not change the original design', () => {
    const design = load();
    updateElement(design, 'a', { position: { x: 1, y: 1 } });
    expect(findElement(design, 'a')?.position).toEqual({ x: 0, y: 0 });
  });

  it('leaves the design alone for an unknown id', () => {
    const design = load();
    expect(updateElement(design, 'zzz', { rotation: 5 })).toEqual(design);
  });

  it('keeps the design valid', () => {
    const next = updateElement(load(), 'b', { size: { width: 99, height: 98 }, rotation: -45 });
    expect(parseDesign(next).ok).toBe(true);
  });
});

describe('addElement', () => {
  it('adds each kind, and the result is a valid design', () => {
    let design = createEmptyDesign();
    for (const kind of ['text', 'rectangle', 'ellipse'] as const) {
      const result = addElement(design, kind);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(findElement(result.design, result.id)).toBeDefined();
      design = result.design;
    }
    expect(design.layouts.desktop.elements.map((e) => e.type)).toEqual(['text', 'shape', 'shape']);
    expect(parseDesign(design).ok).toBe(true);
  });

  it('puts new elements on top and gives them unused ids', () => {
    let design = createEmptyDesign();
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const result = addElement(design, 'text');
      if (!result.ok) throw new Error('add failed');
      ids.push(result.id);
      design = result.design;
    }
    expect(ids).toEqual(['text-1', 'text-2', 'text-3']);
    const { elements } = design.layouts.desktop;
    expect(elements[elements.length - 1]?.id).toBe('text-3');
  });

  it('refuses to go past the element limit', () => {
    let design = createEmptyDesign();
    const { desktop } = design.layouts;
    const filler = addElement(design, 'rectangle');
    if (!filler.ok) throw new Error('add failed');
    const element = filler.design.layouts.desktop.elements[0];
    if (!element) throw new Error('missing');
    const many = Array.from({ length: LIMITS.maxElementsPerLayout }, (_, i) => ({
      ...element,
      id: `r-${i}`,
    }));
    design = { ...design, layouts: { desktop: { ...desktop, elements: many } } };
    const result = addElement(design, 'text');
    expect(result.ok).toBe(false);
  });
});

describe('deleteElement and uniqueId', () => {
  it('removes only the chosen element', () => {
    const design = load();
    const next = deleteElement(design, 'a');
    expect(next.layouts.desktop.elements.map((e) => e.id)).toEqual(['b']);
    expect(design.layouts.desktop.elements).toHaveLength(2);
  });

  it('ignores unknown ids', () => {
    const design = load();
    expect(deleteElement(design, 'zzz')).toEqual(design);
  });

  it('fills gaps in the numbering', () => {
    const design = load();
    expect(uniqueId(design, 'a')).toBe('a-1');
    expect(uniqueId(design, 'b')).toBe('b-1');
  });
});

describe('stacking order', () => {
  function stack(count: number): Design {
    let design = createEmptyDesign();
    for (let i = 0; i < count; i += 1) {
      const result = addElement(design, 'rectangle');
      if (!result.ok) throw new Error('add failed');
      design = result.design;
    }
    return design;
  }
  const ids = (design: Design) => design.layouts.desktop.elements.map((e) => e.id);

  it('brings an element forward and sends it backward', () => {
    const design = stack(3); // rectangle-1 is at the bottom, rectangle-3 on top
    expect(ids(stepElement(design, 'rectangle-1', 'forward'))).toEqual([
      'rectangle-2',
      'rectangle-1',
      'rectangle-3',
    ]);
    expect(ids(stepElement(design, 'rectangle-3', 'backward'))).toEqual([
      'rectangle-1',
      'rectangle-3',
      'rectangle-2',
    ]);
  });

  it('sends to the very back or front', () => {
    const design = stack(3);
    expect(ids(stepElement(design, 'rectangle-3', 'back'))[0]).toBe('rectangle-3');
    expect(ids(stepElement(design, 'rectangle-1', 'front')).pop()).toBe('rectangle-1');
  });

  it('knows when a step is not possible', () => {
    const design = stack(2);
    expect(canStep(design, 'rectangle-2', 'forward')).toBe(false);
    expect(canStep(design, 'rectangle-2', 'front')).toBe(false);
    expect(canStep(design, 'rectangle-2', 'backward')).toBe(true);
    expect(canStep(design, 'rectangle-1', 'back')).toBe(false);
    expect(canStep(design, 'nope', 'forward')).toBe(false);
    expect(stepElement(design, 'rectangle-2', 'forward')).toBe(design);
  });

  it('moves an element onto another one (drag and drop)', () => {
    const design = stack(3);
    expect(ids(moveElementOnto(design, 'rectangle-1', 'rectangle-3'))).toEqual([
      'rectangle-2',
      'rectangle-3',
      'rectangle-1',
    ]);
    expect(ids(moveElementOnto(design, 'rectangle-3', 'rectangle-1'))).toEqual([
      'rectangle-3',
      'rectangle-1',
      'rectangle-2',
    ]);
    expect(moveElementOnto(design, 'rectangle-1', 'rectangle-1')).toBe(design);
    expect(moveElementOnto(design, 'x', 'rectangle-1')).toBe(design);
  });
});
