import type { Design, DesignElement, LayoutName } from '../types';
import { defaultRegistry } from './registry';
import type { ElementRegistry } from './registry';
import { pickLayout } from './responsive';

export interface RenderOptions {
  /** Which layout to draw. A missing phone layout is made by stacking the desktop one. */
  layout?: LayoutName;
  /** Draw elements marked hidden too (the editor does; the public site does not). */
  includeHidden?: boolean;
  registry?: ElementRegistry;
  /** Defaults to the page's document. Tests pass their own. */
  document?: Document;
  /** Called for problems that skip an element, such as an unregistered type. */
  onWarning?: (message: string) => void;
}

function px(value: number): string {
  return `${value}px`;
}

/** The absolutely positioned box that holds one element's content. */
function wrapElement(doc: Document, element: DesignElement, content: HTMLElement): HTMLElement {
  const box = doc.createElement('div');
  box.setAttribute('class', 'design-element');
  box.setAttribute('data-element-id', element.id);
  box.setAttribute('data-element-type', element.type);
  const set = (name: string, value: string) => box.style.setProperty(name, value);
  set('position', 'absolute');
  set('left', px(element.position.x));
  set('top', px(element.position.y));
  set('width', px(element.size.width));
  set('height', px(element.size.height));
  if (element.rotation !== 0) {
    set('transform', `rotate(${element.rotation}deg)`);
    set('transform-origin', 'center');
  }
  if (element.opacity !== 1) set('opacity', String(element.opacity));
  if (element.hidden) set('display', 'none');
  box.appendChild(content);
  return box;
}

/**
 * Draw a design as plain DOM elements and return the root. Works in any page: no framework,
 * no innerHTML. Elements are stacked in list order, so later elements sit on top.
 */
export function renderDesign(design: Design, options: RenderOptions = {}): HTMLElement {
  const doc = options.document ?? document;
  const registry = options.registry ?? defaultRegistry;
  const { name, layout } = pickLayout(design, options.layout ?? 'desktop');

  const root = doc.createElement('div');
  root.setAttribute('class', 'design-root');
  root.setAttribute('data-layout', name);
  root.style.setProperty('position', 'relative');
  root.style.setProperty('overflow', 'hidden');
  root.style.setProperty('width', px(layout.width));
  root.style.setProperty('height', px(layout.height));
  if (layout.background) root.style.setProperty('background', layout.background);

  const context = { document: doc, layoutName: name, layout };
  for (const element of layout.elements) {
    if (element.hidden && !options.includeHidden) continue;
    const definition = registry.get(element.type);
    if (!definition) {
      const why = `no element type "${element.type}" is registered`;
      options.onWarning?.(`Skipped "${element.id}": ${why}.`);
      continue;
    }
    root.appendChild(wrapElement(doc, element, definition.render(element, context)));
  }
  return root;
}
