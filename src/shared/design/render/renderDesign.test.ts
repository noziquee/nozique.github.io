import { describe, expect, it } from 'vitest';
import { parseDesign } from '../parse';
import type { Design } from '../types';
import { createRegistry } from './registry';
import type { ElementDefinition } from './registry';
import { pickLayout, renderDesign } from './renderDesign';
import { asNode, fakeDocument } from './testDom';

/** A test-only element type: a div whose text is the element's text content. */
const labelDefinition: ElementDefinition = {
  type: 'text',
  render(element, context) {
    const node = context.document.createElement('span');
    node.textContent = element.type === 'text' ? element.content.text : '';
    return node;
  },
};

function makeDesign(extra: Record<string, unknown> = {}): Design {
  const result = parseDesign({
    version: 1,
    layouts: {
      desktop: {
        width: 1200,
        height: 600,
        background: '#111111',
        elements: [
          {
            id: 'a',
            type: 'text',
            position: { x: 10, y: 20 },
            size: { width: 300, height: 60 },
            rotation: 15,
            opacity: 0.5,
            content: { text: 'First' },
            style: { fontFamily: 'Archivo', fontSize: 40, color: '#ffffff' },
          },
          {
            id: 'b',
            type: 'text',
            position: { x: 0, y: 0 },
            size: { width: 50, height: 50 },
            content: { text: 'Second' },
            style: { fontFamily: 'Archivo', fontSize: 20, color: '#ffffff' },
          },
          {
            id: 'c',
            type: 'text',
            hidden: true,
            position: { x: 0, y: 0 },
            size: { width: 50, height: 50 },
            content: { text: 'Hidden' },
            style: { fontFamily: 'Archivo', fontSize: 20, color: '#ffffff' },
          },
        ],
      },
      ...extra,
    },
  });
  if (!result.ok) throw new Error(result.errors.join('; '));
  return result.design;
}

function registryWithLabel() {
  const registry = createRegistry();
  registry.register(labelDefinition);
  return registry;
}

describe('renderDesign', () => {
  const options = { document: fakeDocument, registry: registryWithLabel() };

  it('draws a sized root with the layout background', () => {
    const root = asNode(renderDesign(makeDesign(), options));
    expect(root.attributes['class']).toBe('design-root');
    expect(root.styles).toMatchObject({ width: '1200px', height: '600px', background: '#111111' });
  });

  it('puts each element in a positioned box, in list order', () => {
    const root = asNode(renderDesign(makeDesign(), options));
    const ids = root.children.map((box) => box.attributes['data-element-id']);
    expect(ids).toEqual(['a', 'b']);
    expect(root.children[0]?.styles).toMatchObject({
      position: 'absolute',
      left: '10px',
      top: '20px',
      width: '300px',
      height: '60px',
      transform: 'rotate(15deg)',
      opacity: '0.5',
    });
  });

  it('leaves out default rotation and opacity', () => {
    const root = asNode(renderDesign(makeDesign(), options));
    expect(root.children[1]?.styles['transform']).toBeUndefined();
    expect(root.children[1]?.styles['opacity']).toBeUndefined();
  });

  it('puts what the element definition returns inside the box', () => {
    const root = asNode(renderDesign(makeDesign(), options));
    expect(root.children[0]?.children[0]?.textContent).toBe('First');
  });

  it('skips hidden elements unless asked to include them', () => {
    const shown = asNode(renderDesign(makeDesign(), { ...options, includeHidden: true }));
    expect(shown.children).toHaveLength(3);
    expect(shown.children[2]?.styles['display']).toBe('none');
  });

  it('skips unregistered types and says so', () => {
    const warnings: string[] = [];
    const root = asNode(
      renderDesign(makeDesign(), {
        document: fakeDocument,
        registry: createRegistry(),
        onWarning: (message) => warnings.push(message),
      }),
    );
    expect(root.children).toHaveLength(0);
    expect(warnings[0]).toContain('no element type "text"');
  });

  it('passes the layout to the element definition', () => {
    let seen = '';
    const registry = createRegistry();
    registry.register({
      type: 'text',
      render(_element, context) {
        seen = `${context.layoutName}:${context.layout.width}`;
        return context.document.createElement('span');
      },
    });
    renderDesign(makeDesign(), { document: fakeDocument, registry });
    expect(seen).toBe('desktop:1200');
  });
});

describe('layouts', () => {
  it('uses the desktop layout when there is no phone layout', () => {
    expect(pickLayout(makeDesign(), 'mobile').name).toBe('desktop');
  });
  it('uses the phone layout when there is one', () => {
    const phone = { width: 390, height: 800, elements: [] };
    const design = makeDesign({ mobile: phone });
    expect(pickLayout(design, 'mobile')).toMatchObject({ name: 'mobile' });
    const registry = createRegistry();
    const settings = { document: fakeDocument, registry, layout: 'mobile' } as const;
    const root = asNode(renderDesign(design, settings));
    expect(root.attributes['data-layout']).toBe('mobile');
    expect(root.styles['width']).toBe('390px');
  });
});

describe('registry', () => {
  it('refuses to register the same type twice', () => {
    const registry = registryWithLabel();
    expect(() => registry.register(labelDefinition)).toThrow('already registered');
  });
  it('lists what is registered', () => {
    const registry = registryWithLabel();
    expect(registry.types()).toEqual(['text']);
    expect(registry.has('shape')).toBe(false);
  });
});
