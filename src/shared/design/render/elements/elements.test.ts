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

const button = (content: Record<string, unknown> = {}, style: Record<string, unknown> = {}) => ({
  ...base,
  id: 'b',
  type: 'button',
  content: { label: 'Hire me', ...content },
  style: { fontFamily: 'Archivo', fontSize: 18, color: '#ffffff', fill: '#e8281e', ...style },
});

function renderButton(
  content: Record<string, unknown>,
  style: Record<string, unknown> = {},
  editing = false,
) {
  const result = parseDesign({
    version: 1,
    layouts: { desktop: { width: 800, height: 400, elements: [button(content, style)] } },
  });
  if (!result.ok) throw new Error(result.errors.join('; '));
  const registry = createRegistry();
  registerBuiltInElements(registry);
  const root = asNode(renderDesign(result.design, { document: fakeDocument, registry, editing }));
  return asNode(asNode(root.children[0]).children[0]);
}

describe('button element', () => {
  it('draws a box with the label as plain text and the colours as custom properties', () => {
    const node = renderButton({}, { hoverFill: '#000000', radius: 28 });
    expect(node.tagName).toBe('div');
    expect(node.textContent).toBe('Hire me');
    expect(node.attributes['class']).toBe('design-button');
    expect(node.styles).toMatchObject({
      '--db-fill': '#e8281e',
      '--db-color': '#ffffff',
      '--db-hover-fill': '#000000',
      'border-radius': '28px',
      'font-weight': '700',
    });
    expect(node.styles['--db-hover-color']).toBeUndefined();
  });

  it('is a real link when it has an address', () => {
    const node = renderButton({ href: '#/contact' });
    expect(node.tagName).toBe('a');
    expect(node.attributes).toMatchObject({ href: '#/contact' });
    expect(node.attributes['target']).toBeUndefined();
  });

  it('opens web addresses in a new tab safely, but never internal ones', () => {
    const web = renderButton({ href: 'https://example.com', newTab: true });
    expect(web.attributes).toMatchObject({ target: '_blank', rel: 'noopener noreferrer' });
    const inside = renderButton({ href: '#/work', newTab: true });
    expect(inside.attributes['target']).toBeUndefined();
  });

  it('does nothing when clicked inside the editor', () => {
    const node = renderButton({ href: 'https://example.com' }, {}, true);
    expect(node.tagName).toBe('div');
    expect(node.attributes['href']).toBeUndefined();
  });

  it('keeps odd label text as plain text and draws a border only when asked', () => {
    const node = renderButton({ label: '<img src=x onerror=1>' }, { borderColor: '#fff', borderWidth: 2 });
    expect(node.textContent).toBe('<img src=x onerror=1>');
    expect(node.children).toHaveLength(0);
    expect(node.styles['border']).toBe('2px solid #fff');
    expect(renderButton({}).styles['border']).toBeUndefined();
  });
});

const icon = (content: Record<string, unknown> = {}, style: Record<string, unknown> = {}) => ({
  ...base,
  id: 'ic',
  type: 'icon',
  content: { icon: 'instagram', label: 'Instagram', ...content },
  style: { color: '#ffffff', fill: '#e8281e', ...style },
});

function renderIcon(content: Record<string, unknown>, style = {}, editing = false) {
  const result = parseDesign({
    version: 1,
    layouts: { desktop: { width: 800, height: 400, elements: [icon(content, style)] } },
  });
  if (!result.ok) throw new Error(result.errors.join('; '));
  const registry = createRegistry();
  registerBuiltInElements(registry);
  const root = asNode(renderDesign(result.design, { document: fakeDocument, registry, editing }));
  return asNode(asNode(root.children[0]).children[0]);
}

describe('icon element', () => {
  it('draws the chosen icon as an svg, hidden from screen readers, with an accessible label', () => {
    const node = renderIcon({});
    expect(node.attributes).toMatchObject({ class: 'design-icon', 'aria-label': 'Instagram', role: 'img' });
    const svg = asNode(node.children[0]);
    expect(svg.tagName).toBe('svg');
    expect(svg.attributes).toMatchObject({ 'aria-hidden': 'true', stroke: 'currentColor' });
    expect(svg.children.length).toBeGreaterThan(0);
  });

  it('is a labelled link when it has an address', () => {
    const node = renderIcon({ href: 'https://instagram.com/nozique', newTab: true });
    expect(node.tagName).toBe('a');
    expect(node.attributes).toMatchObject({
      href: 'https://instagram.com/nozique',
      'aria-label': 'Instagram',
      target: '_blank',
      rel: 'noopener noreferrer',
    });
    expect(node.attributes['role']).toBeUndefined();
  });

  it('links to a place on the same page without opening a new tab', () => {
    const node = renderIcon({ href: '#about', newTab: true });
    expect(node.attributes).toMatchObject({ href: '#about' });
    expect(node.attributes['target']).toBeUndefined();
  });

  it('shapes the background and colours it through custom properties', () => {
    expect(renderIcon({}).styles['border-radius']).toBe('50%');
    expect(renderIcon({}, { shape: 'rounded' }).styles['border-radius']).toBe('22%');
    expect(renderIcon({}, { shape: 'square' }).styles['border-radius']).toBe('0');
    expect(renderIcon({}, { hoverFill: '#000000' }).styles).toMatchObject({
      '--db-fill': '#e8281e',
      '--db-color': '#ffffff',
      '--db-hover-fill': '#000000',
    });
  });

  it('does nothing when clicked inside the editor', () => {
    const node = renderIcon({ href: 'https://instagram.com/x' }, {}, true);
    expect(node.tagName).toBe('div');
    expect(node.attributes['href']).toBeUndefined();
  });
});

describe('text as a link', () => {
  function renderText(content: Record<string, unknown>, editing = false) {
    const result = parseDesign({
      version: 1,
      layouts: {
        desktop: {
          width: 800,
          height: 400,
          elements: [text({}, 'Hello')].map((el) => ({ ...el, content: { text: 'Hello', ...content } })),
        },
      },
    });
    if (!result.ok) throw new Error(result.errors.join('; '));
    const registry = createRegistry();
    registerBuiltInElements(registry);
    const root = asNode(renderDesign(result.design, { document: fakeDocument, registry, editing }));
    return asNode(asNode(root.children[0]).children[0]);
  }

  it('stays a plain box without a link', () => {
    expect(renderText({}).tagName).toBe('div');
  });

  it('becomes a link without underline unless the design asks for it', () => {
    const node = renderText({ href: '#/contact' });
    expect(node.tagName).toBe('a');
    expect(node.attributes).toMatchObject({ href: '#/contact' });
    expect(node.styles).toMatchObject({ display: 'block', 'text-decoration': 'none' });
    expect(node.textContent).toBe('Hello');
  });

  it('stays plain text inside the editor', () => {
    expect(renderText({ href: '#/contact' }, true).tagName).toBe('div');
  });
});

describe('registerBuiltInElements', () => {
  it('registers every built-in type, and can be called twice', () => {
    const registry = createRegistry();
    registerBuiltInElements(registry);
    registerBuiltInElements(registry);
    expect(registry.types().sort()).toEqual(['button', 'icon', 'image', 'shape', 'text']);
  });
});
