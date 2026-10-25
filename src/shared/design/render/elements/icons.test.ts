import { describe, expect, it } from 'vitest';
import { ICON_NAMES } from '../../schema';
import { ICON_ARTWORK } from './icons';

describe('icon artwork', () => {
  it('has drawings for every icon the design format allows', () => {
    for (const name of ICON_NAMES) {
      expect(ICON_ARTWORK[name].length, name).toBeGreaterThan(0);
    }
    expect(Object.keys(ICON_ARTWORK).sort()).toEqual([...ICON_NAMES].sort());
  });

  it('only uses plain drawing shapes with plain numeric values', () => {
    const tags = ['path', 'rect', 'circle', 'line', 'polyline', 'polygon'];
    const plain = /^[0-9a-zA-Z .,-]+$/;
    for (const name of ICON_NAMES) {
      for (const part of ICON_ARTWORK[name]) {
        expect(tags, name).toContain(part.tag);
        for (const [attribute, value] of Object.entries(part.attrs)) {
          expect(attribute, name).toMatch(/^[a-z0-9]+$/);
          expect(value, `${name} ${attribute}`).toMatch(plain);
        }
      }
    }
  });
});
