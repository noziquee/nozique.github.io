import { describe, expect, it } from 'vitest';
import { createEmptyDesign } from '../../shared/design';
import type { Design } from '../../shared/design';
import { addElement, addImageElement, findElement } from './designOps';
import { COMMON_GROUPS, TYPE_GROUPS, applyField, getAt, setAt } from './fields';

function withElement(kind: 'text' | 'rectangle' | 'button' | 'image'): { design: Design; id: string } {
  const result =
    kind === 'image'
      ? addImageElement(createEmptyDesign(), {
          src: 'https://example.com/a.webp',
          alt: 'A drawing',
          width: 400,
          height: 300,
        })
      : addElement(createEmptyDesign(), kind);
  if (!result.ok) throw new Error('add failed');
  return { design: result.design, id: result.id };
}

describe('getAt and setAt', () => {
  it('read and write nested values without changing the original', () => {
    const source = { a: { b: 1, c: 2 }, d: 3 };
    expect(getAt(source, 'a.b')).toBe(1);
    expect(getAt(source, 'a.x.y')).toBeUndefined();
    const next = setAt(source, 'a.b', 9);
    expect(next).toEqual({ a: { b: 9, c: 2 }, d: 3 });
    expect(source.a.b).toBe(1);
  });

  it('removes a key when the value is undefined', () => {
    expect(setAt({ a: 1, b: 2 }, 'a', undefined)).toEqual({ b: 2 });
  });
});

describe('applyField', () => {
  it('changes a text property', () => {
    const { design, id } = withElement('text');
    const result = applyField(design, id, { key: 'content.text' }, 'Hello');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getAt(findElement(result.design, id), 'content.text')).toBe('Hello');
  });

  it('changes a number and a colour', () => {
    const { design, id } = withElement('rectangle');
    const sized = applyField(design, id, { key: 'size.width' }, 333);
    expect(sized.ok && getAt(findElement(sized.design, id), 'size.width')).toBe(333);
    const coloured = applyField(design, id, { key: 'style.fill' }, '#112233');
    expect(coloured.ok && getAt(findElement(coloured.design, id), 'style.fill')).toBe('#112233');
  });

  it('refuses values the format does not allow, with a readable message', () => {
    const { design, id } = withElement('rectangle');
    const tooBig = applyField(design, id, { key: 'size.width' }, 99999);
    expect(tooBig.ok).toBe(false);
    const badColour = applyField(design, id, { key: 'style.fill' }, 'url(http://evil)');
    expect(badColour.ok).toBe(false);
    expect(!badColour.ok && badColour.error).toMatch(/colour/);
    const badOpacity = applyField(design, id, { key: 'opacity' }, 2);
    expect(badOpacity.ok).toBe(false);
  });

  it('removes an optional value', () => {
    const { design, id } = withElement('rectangle');
    const added = applyField(design, id, { key: 'style.stroke' }, '#ffffff');
    if (!added.ok) throw new Error('should be valid');
    const removed = applyField(added.design, id, { key: 'style.stroke' }, undefined);
    expect(removed.ok && getAt(findElement(removed.design, id), 'style.stroke')).toBeUndefined();
  });

  it('does not touch the original design, and reports unknown ids', () => {
    const { design, id } = withElement('text');
    applyField(design, id, { key: 'content.text' }, 'Changed');
    expect(getAt(findElement(design, id), 'content.text')).toBe('New text');
    expect(applyField(design, 'nope', { key: 'rotation' }, 5).ok).toBe(false);
  });
});

describe('field lists', () => {
  it('only name properties that exist on a new element of that type', () => {
    const cases = [
      { kind: 'text' as const, type: 'text' as const },
      { kind: 'rectangle' as const, type: 'shape' as const },
      { kind: 'image' as const, type: 'image' as const },
      { kind: 'button' as const, type: 'button' as const },
    ];
    for (const { kind, type } of cases) {
      const { design, id } = withElement(kind);
      const element = findElement(design, id);
      const groups = [...COMMON_GROUPS, ...TYPE_GROUPS[type]];
      for (const field of groups.flatMap((group) => group.fields)) {
        // Optional fields may be absent on a new element; all others must be present.
        const optional = 'optional' in field && field.optional;
        if (!optional) expect(getAt(element, field.key), field.key).not.toBeUndefined();
      }
    }
  });
});

describe('image fields', () => {
  it('accepts a crop and refuses a picture address that is not https', () => {
    const { design, id } = withElement('image');
    const zoomed = applyField(design, id, { key: 'style.zoom' }, 2);
    expect(zoomed.ok && getAt(findElement(zoomed.design, id), 'style.zoom')).toBe(2);
    expect(applyField(design, id, { key: 'style.zoom' }, 9).ok).toBe(false);
    expect(applyField(design, id, { key: 'content.src' }, 'http://example.com/a.png').ok).toBe(
      false,
    );
    const replaced = applyField(design, id, { key: 'content.src' }, 'https://example.com/b.webp');
    expect(replaced.ok).toBe(true);
  });
});

describe('button fields', () => {
  it('accepts safe links and refuses unsafe ones', () => {
    const { design, id } = withElement('button');
    const link = (value: string) => applyField(design, id, { key: 'content.href' }, value).ok;
    for (const good of ['', 'https://example.com/a?b=1', '#/work', '#/', 'mailto:me@example.com']) {
      expect(link(good), good).toBe(true);
    }
    for (const bad of ['javascript:alert(1)', 'http://example.com', 'data:text/html,x', '//evil.com']) {
      expect(link(bad), bad).toBe(false);
    }
  });

  it('needs a label', () => {
    const { design, id } = withElement('button');
    expect(applyField(design, id, { key: 'content.label' }, '').ok).toBe(false);
    expect(applyField(design, id, { key: 'content.label' }, 'Hire me').ok).toBe(true);
  });

  it('takes hover colours and lets them be removed', () => {
    const { design, id } = withElement('button');
    const hovered = applyField(design, id, { key: 'style.hoverFill' }, '#000000');
    if (!hovered.ok) throw new Error('should be valid');
    const cleared = applyField(hovered.design, id, { key: 'style.hoverFill' }, undefined);
    expect(cleared.ok && getAt(findElement(cleared.design, id), 'style.hoverFill')).toBeUndefined();
  });
});
