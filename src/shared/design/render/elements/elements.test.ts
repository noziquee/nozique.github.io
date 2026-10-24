import { describe, expect, it } from 'vitest';
import { parseDesign } from '../../parse';
import { createRegistry } from '../registry';
import { renderDesign } from '../renderDesign';
import { asNode, fakeDocument } from '../testDom';
import { registerBuiltInElements } from './index';

function render(elements: unknown[]) {
  const result = parseDesign({
    version: 1,
    layouts: { desktop: { width: 800, height: 400, elements } },
  });
  if (!result.ok) throw new Error(result.errors.join('; '));
  const registry = createRegistry();
  registerBuiltInElements(registry);
  const root = asNode(renderDesign(result.design, { document: fakeDocument, registry }));
  return root.children.map((box) => asNode(box.children[0]));
}

const base = { position: { x: 0, y: 0 }, size: { width: 200, height: 80 } };

const text = (style: Record<string, unknown>, content = 'Hello') => ({
  ...base,
  id: 't',
  type: 'text',
  content: { text: content },
  style: { fontFamily: 'var(--font-display)', fontSize: 48, color: '#e8281e', ...style },
});

const shape = (extra: Record<string, unknown>) => ({
  ...base,
  id: 's',
  type: 'shape',
  style: { fill: '#e8281e' },
  ...extra,
});

describe('text element', () => {
  it('shows the text as plain text and applies the style', () => {
    const [node] = render([text({})]);
    expect(node?.textContent).toBe('Hello');
    expect(node?.styles).toMatchObject({
      'font-family': 'var(--font-display)',
      'font-size': '48px',
      'font-weight': '400',
      'line-height': '1.2',
      'letter-spacing': '0px',
      'text-align': 'left',
      color: '#e8281e',
      'white-space': 'pre-wrap',
    });
    expect(node?.styles['font-style']).toBeUndefined();
    expect(node?.styles['text-decoration']).toBeUndefined();
  });
  it('keeps markup typed into the text as plain text', () => {
    const [node] = render([text({}, '<img src=x onerror=alert(1)>')]);
    expect(node?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(node?.children).toHaveLength(0);
  });
  it('adds a fallback to plain font names', () => {
    const [node] = render([text({ fontFamily: 'Archivo' })]);
    expect(node?.styles['font-family']).toBe('"Archivo", sans-serif');
  });
  it('applies italic, underline, alignment and weight', () => {
    const [node] = render([
      text({ italic: true, underline: true, align: 'center', fontWeight: 700 }),
    ]);
    expect(node?.styles).toMatchObject({
      'font-style': 'italic',
      'text-decoration': 'underline',
      'text-align': 'center',
      'font-weight': '700',
    });
  });
});

describe('shape element', () => {
  it('draws a filled rectangle with square corners by default', () => {
    const [node] = render([shape({})]);
    expect(node?.styles).toMatchObject({ background: '#e8281e', 'border-radius': '0px' });
    expect(node?.styles['border']).toBeUndefined();
  });
  it('rounds corners', () => {
    const [node] = render([shape({ style: { fill: '#000', radius: 24 } })]);
    expect(node?.styles['border-radius']).toBe('24px');
  });
  it('draws an ellipse', () => {
    const [node] = render([shape({ shape: 'ellipse' })]);
    expect(node?.styles['border-radius']).toBe('50%');
  });
  it('draws an outline only when there is a stroke and a width', () => {
    const [outlined] = render([shape({ style: { fill: '#000', stroke: '#fff', strokeWidth: 3 } })]);
    expect(outlined?.styles['border']).toBe('3px solid #fff');
    const [flat] = render([shape({ style: { fill: '#000', stroke: '#fff' } })]);
    expect(flat?.styles['border']).toBeUndefined();
  });
});

const image = (extra: Record<string, unknown> = {}, style: Record<string, unknown> = {}) => ({
  ...base,
  id: 'i',
  type: 'image',
  content: { src: 'https://example.com/a.webp', alt: 'A drawing' },
  style,
  ...extra,
});

describe('image element', () => {
  it('draws a picture that fills its frame, cropped to cover by default', () => {
    const [frame] = render([image()]);
    const picture = asNode(frame?.children[0]);
    expect(picture.tagName).toBe('img');
    expect(picture.attributes).toMatchObject({
      src: 'https://example.com/a.webp',
      alt: 'A drawing',
      referrerpolicy: 'no-referrer',
    });
    expect(picture.styles).toMatchObject({
      'object-fit': 'cover',
      'object-position': '50% 50%',
      width: '100%',
      height: '100%',
    });
    expect(picture.styles['transform']).toBeUndefined();
    expect(frame?.styles).toMatchObject({ overflow: 'hidden', 'border-radius': '0px' });
  });

  it('applies fit, rounded corners and the crop (focus and zoom)', () => {
    const [frame] = render([
      image({}, { fit: 'contain', radius: 20, focusX: 25, focusY: 75, zoom: 2 }),
    ]);
    const picture = asNode(frame?.children[0]);
    expect(frame?.styles['border-radius']).toBe('20px');
    expect(picture.styles).toMatchObject({
      'object-fit': 'contain',
      'object-position': '25% 75%',
      transform: 'scale(2)',
      'transform-origin': '25% 75%',
    });
  });

  it('keeps odd alt text as a plain value', () => {
    const [frame] = render([
      image({ content: { src: 'https://example.com/a.webp', alt: '"><script>x</script>' } }),
    ]);
    expect(asNode(frame?.children[0]).attributes['alt']).toBe('"><script>x</script>');
    expect(frame?.children).toHaveLength(1);
  });
});

describe('registerBuiltInElements', () => {
  it('registers every built-in type, and can be called twice', () => {
    const registry = createRegistry();
    registerBuiltInElements(registry);
    registerBuiltInElements(registry);
    expect(registry.types().sort()).toEqual(['image', 'shape', 'text']);
  });
});
