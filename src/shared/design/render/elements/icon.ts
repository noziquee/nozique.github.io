import type { IconElement } from '../../types';
import type { ElementDefinition } from '../registry';
import { ensureDesignStyles } from '../styles';
import { ICON_ARTWORK } from './icons';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const RADIUS = { circle: '50%', rounded: '22%', square: '0' } as const;

export const iconElement: ElementDefinition<IconElement> = {
  type: 'icon',
  render(element, context) {
    const { content, style } = element;
    const doc = context.document;
    ensureDesignStyles(doc);
    const linked = content.href !== '' && !context.editing;
    const node = doc.createElement(linked ? 'a' : 'div');
    node.setAttribute('class', 'design-icon');
    // The label is what a screen reader says; the drawing itself is hidden from it.
    node.setAttribute('aria-label', content.label);
    if (linked) {
      node.setAttribute('href', content.href);
      if (content.newTab && content.href.startsWith('https://')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    } else {
      node.setAttribute('role', 'img');
    }
    const set = (name: string, value: string) => node.style.setProperty(name, value);
    set('--db-fill', style.fill);
    set('--db-color', style.color);
    if (style.hoverFill) set('--db-hover-fill', style.hoverFill);
    if (style.hoverColor) set('--db-hover-color', style.hoverColor);
    set('background-color', 'var(--db-fill)');
    set('color', 'var(--db-color)');
    set('border-radius', RADIUS[style.shape]);
    if (style.borderColor && style.borderWidth > 0) {
      set('border', `${style.borderWidth}px solid ${style.borderColor}`);
    }

    const svg = doc.createElementNS(SVG_NAMESPACE, 'svg');
    const attributes: Record<string, string> = {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    };
    for (const [name, value] of Object.entries(attributes)) svg.setAttribute(name, value);
    svg.style.setProperty('width', '54%');
    svg.style.setProperty('height', '54%');
    for (const part of ICON_ARTWORK[content.icon]) {
      const shape = doc.createElementNS(SVG_NAMESPACE, part.tag);
      for (const [name, value] of Object.entries(part.attrs)) shape.setAttribute(name, value);
      svg.appendChild(shape);
    }
    node.appendChild(svg);
    return node;
  },
};
