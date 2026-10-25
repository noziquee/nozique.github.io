import type { TextElement } from '../../types';
import type { ElementDefinition } from '../registry';

/** A font token like var(--font-display) is used as it is; a plain name gets a fallback. */
function fontStack(fontFamily: string): string {
  return fontFamily.startsWith('var(') ? fontFamily : `"${fontFamily}", sans-serif`;
}

export const textElement: ElementDefinition<TextElement> = {
  type: 'text',
  render(element, context) {
    const { style, content } = element;
    // A link on the public site; in the editor it is plain text so clicks never navigate.
    const linked = content.href !== '' && !context.editing;
    const node = context.document.createElement(linked ? 'a' : 'div');
    node.setAttribute('class', 'design-text');
    if (linked) {
      node.setAttribute('href', content.href);
      if (content.newTab && content.href.startsWith('https://')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
    // textContent, never innerHTML: whatever is typed stays plain text.
    node.textContent = element.content.text;
    const set = (name: string, value: string) => node.style.setProperty(name, value);
    set('width', '100%');
    set('height', '100%');
    set('box-sizing', 'border-box');
    set('margin', '0');
    set('white-space', 'pre-wrap');
    set('overflow-wrap', 'anywhere');
    set('font-family', fontStack(style.fontFamily));
    set('font-size', `${style.fontSize}px`);
    set('font-weight', String(style.fontWeight));
    set('line-height', String(style.lineHeight));
    set('letter-spacing', `${style.letterSpacing}px`);
    set('text-align', style.align);
    set('color', style.color);
    if (style.italic) set('font-style', 'italic');
    if (linked) set('display', 'block');
    // Links are only underlined when the design says so.
    if (style.underline) set('text-decoration', 'underline');
    else if (linked) set('text-decoration', 'none');
    return node;
  },
};
