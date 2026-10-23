import { describe, expect, it } from 'vitest';
import { parseDesign } from '../parse';
import type { Layout } from '../types';
import { chooseLayoutName, deriveMobileLayout, scaleFor } from './responsive';

const text = (id: string, x: number, y: number, w: number, h: number, hidden = false) => ({
  id,
  type: 'text',
  hidden,
  position: { x, y },
  size: { width: w, height: h },
  content: { text: id },
  style: { fontFamily: 'Archivo', fontSize: 20, color: '#ffffff' },
});

const shape = (id: string, x: number, y: number, w: number, h: number) => ({
  id,
  type: 'shape',
  position: { x, y },
  size: { width: w, height: h },
  style: { fill: '#e8281e' },
});

function layoutOf(elements: unknown[], background?: string): Layout {
  const result = parseDesign({
    version: 1,
    layouts: { desktop: { width: 1200, height: 800, background, elements } },
  });
  if (!result.ok) throw new Error(result.errors.join('; '));
  return result.design.layouts.desktop;
}

describe('deriveMobileLayout', () => {
  it('stacks elements top to bottom in reading order', () => {
    const phone = deriveMobileLayout(
      layoutOf([
        text('c', 700, 300, 300, 40),
        text('a', 100, 100, 300, 40),
        text('b', 700, 100, 300, 40),
      ]),
    );
    expect(phone.elements.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    const ys = phone.elements.map((e) => e.position.y);
    expect(ys).toEqual([16, 72, 128]);
  });

  it('fits wide elements to the column and keeps shapes in proportion', () => {
    const phone = deriveMobileLayout(layoutOf([shape('wide', 0, 0, 716, 200)]));
    expect(phone.elements[0]?.size).toEqual({ width: 358, height: 100 });
    expect(phone.elements[0]?.position.x).toBe(16);
  });

  it('keeps the height of text and the left edge', () => {
    const phone = deriveMobileLayout(layoutOf([text('t', 50, 0, 600, 120)]));
    expect(phone.elements[0]?.size).toEqual({ width: 358, height: 120 });
  });

  it('centers narrow shapes and leaves narrow text at the left', () => {
    const elements = [shape('dot', 0, 0, 100, 100), text('t', 0, 200, 100, 30)];
    const phone = deriveMobileLayout(layoutOf(elements));
    expect(phone.elements[0]?.position.x).toBe(145);
    expect(phone.elements[1]?.position.x).toBe(16);
  });

  it('keeps hidden elements hidden and out of the stack', () => {
    const elements = [text('a', 0, 0, 300, 40), text('h', 0, 50, 300, 40, true)];
    const phone = deriveMobileLayout(layoutOf(elements));
    expect(phone.elements.map((e) => [e.id, e.hidden])).toEqual([
      ['a', false],
      ['h', true],
    ]);
    expect(phone.height).toBe(16 + 40 + 16);
  });

  it('sets the phone width, total height and background', () => {
    const phone = deriveMobileLayout(layoutOf([text('a', 0, 0, 300, 40)], '#111111'));
    expect(phone).toMatchObject({ width: 390, height: 72, background: '#111111' });
  });

  it('handles an empty layout and does not change the desktop one', () => {
    expect(deriveMobileLayout(layoutOf([])).height).toBe(50);
    const desktop = layoutOf([shape('wide', 0, 0, 716, 200)]);
    deriveMobileLayout(desktop);
    expect(desktop.elements[0]?.size.width).toBe(716);
  });

  it('produces a layout that is valid in the design format', () => {
    const elements = [text('a', 0, 0, 600, 80), shape('b', 0, 100, 900, 300)];
    const phone = deriveMobileLayout(layoutOf(elements));
    const result = parseDesign({ version: 1, layouts: { desktop: layoutOf([]), mobile: phone } });
    expect(result.ok).toBe(true);
  });
});

describe('deriveMobileLayout: shapes behind other elements', () => {
  const card = [
    shape('panel', 0, 0, 500, 400),
    text('one', 50, 50, 400, 60),
    text('two', 50, 150, 400, 40),
    shape('dot', 600, 0, 100, 100),
  ];

  it('stacks the elements inside the shape and makes the shape wrap them', () => {
    const phone = deriveMobileLayout(layoutOf(card));
    expect(phone.elements.map((e) => e.id)).toEqual(['panel', 'one', 'two', 'dot']);
    const [panel, one, two, dot] = phone.elements;
    expect(panel?.position).toEqual({ x: 16, y: 16 });
    expect(panel?.size).toEqual({ width: 358, height: 148 });
    expect(one?.position).toEqual({ x: 32, y: 32 });
    expect(one?.size.width).toBe(326);
    expect(two?.position).toEqual({ x: 32, y: 108 });
    expect(dot?.position).toEqual({ x: 145, y: 180 });
  });

  it('keeps the shape behind its contents in the stacking order', () => {
    const phone = deriveMobileLayout(layoutOf(card));
    expect(phone.elements.findIndex((e) => e.id === 'panel')).toBeLessThan(
      phone.elements.findIndex((e) => e.id === 'one'),
    );
  });

  it('is still a valid design', () => {
    const phone = deriveMobileLayout(layoutOf(card));
    const result = parseDesign({ version: 1, layouts: { desktop: layoutOf([]), mobile: phone } });
    expect(result.ok).toBe(true);
  });
});

describe('chooseLayoutName and scaleFor', () => {
  it('uses the phone layout at or below the breakpoint', () => {
    expect(chooseLayoutName(390)).toBe('mobile');
    expect(chooseLayoutName(700)).toBe('mobile');
    expect(chooseLayoutName(701)).toBe('desktop');
    expect(chooseLayoutName(1440)).toBe('desktop');
  });
  it('uses desktop when the width is unknown', () => {
    expect(chooseLayoutName(0)).toBe('desktop');
  });
  it('shrinks to fit but never enlarges', () => {
    expect(scaleFor(600, 1200)).toBe(0.5);
    expect(scaleFor(1600, 1200)).toBe(1);
    expect(scaleFor(0, 1200)).toBe(1);
  });
});
