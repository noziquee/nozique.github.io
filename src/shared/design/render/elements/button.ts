import type { ButtonElement } from '../../types';
import type { ElementDefinition } from '../registry';
import { ensureDesignStyles } from '../styles';

function fontStack(fontFamily: string): string {
  return fontFamily.startsWith('var(') ? fontFamily : `"${fontFamily}", sans-serif`;
}

export const buttonElement: ElementDefinition<ButtonElement> = {
  type: 'button',
  render(element, context) {
    const { content, style } = element;
    const doc = context.document;
    ensureDesignStyles(doc);
    // A real link on the public site; in the editor it is a plain box so clicks never navigate.
    const linked = content.href !== '' && !context.editing;
    const node = doc.createElement(linked ? 'a' : 'div');
    node.setAttribute('class', 'design-button');
    if (linked) {
      node.setAttribute('href', content.href);
      if (content.newTab && content.href.startsWith('https://')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    node.textContent = content.label;
    const set = (name: string, value: string) => node.style.setProperty(name, value);
    set('--db-fill', style.fill);
    set('--db-color', style.color);
    if (style.hoverFill) set('--db-hover-fill', style.hoverFill);
    if (style.hoverColor) set('--db-hover-color', style.hoverColor);
    set('background-color', 'var(--db-fill)');
    set('color', 'var(--db-color)');
    set('font-family', fontStack(style.fontFamily));
    set('font-size', `${style.fontSize}px`);
    set('font-weight', String(style.fontWeight));
    set('letter-spacing', `${style.letterSpacing}px`);
    set('border-radius', `${style.radius}px`);
    if (style.borderColor && style.borderWidth > 0) {
      set('border', `${style.borderWidth}px solid ${style.borderColor}`);
    }
    return node;
  },
};
