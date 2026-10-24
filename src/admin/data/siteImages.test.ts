import { describe, expect, it } from 'vitest';
import { altFromFileName } from './siteImages';

describe('altFromFileName', () => {
  it('turns a file name into plain words', () => {
    expect(altFromFileName('my-cool_drawing.png')).toBe('my cool drawing');
    expect(altFromFileName('  IMG__0042.JPG ')).toBe('IMG 0042');
  });

  it('copes with names without an extension and very long names', () => {
    expect(altFromFileName('sketch')).toBe('sketch');
    expect(altFromFileName(`${'a'.repeat(400)}.png`)).toHaveLength(300);
  });
});
