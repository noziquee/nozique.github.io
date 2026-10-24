import { describe, expect, it } from 'vitest';
import { parseDesign } from '../../shared/design';
import type { Design } from '../../shared/design';
import { findElement, updateElement } from './designOps';

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
      elements: [
        shape('a', 0, 10, '#fff'),
        shape('b', 5, 20, '#000'),
      ],
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
