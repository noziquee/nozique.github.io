import type { ImageElement } from '../../types';
import type { ElementDefinition } from '../registry';

export const imageElement: ElementDefinition<ImageElement> = {
  type: 'image',
  render(element, context) {
    const { content, style } = element;
    const frame = context.document.createElement('div');
    frame.setAttribute('class', 'design-image');
    const setFrame = (name: string, value: string) => frame.style.setProperty(name, value);
    setFrame('width', '100%');
    setFrame('height', '100%');
    setFrame('overflow', 'hidden');
    setFrame('box-sizing', 'border-box');
    setFrame('border-radius', `${style.radius}px`);

    // The address is checked by the design format (https only) and set as a plain attribute.
    const picture = context.document.createElement('img');
    picture.setAttribute('src', content.src);
    picture.setAttribute('alt', content.alt);
    picture.setAttribute('referrerpolicy', 'no-referrer');
    picture.setAttribute('draggable', 'false');
    picture.setAttribute('decoding', 'async');
    const set = (name: string, value: string) => picture.style.setProperty(name, value);
    set('display', 'block');
    set('width', '100%');
    set('height', '100%');
    set('max-width', 'none');
    set('object-fit', style.fit);
    set('object-position', `${style.focusX}% ${style.focusY}%`);
    // Zoom crops in around the focus point; at 1 nothing needs to be done.
    if (style.zoom !== 1) {
      set('transform', `scale(${style.zoom})`);
      set('transform-origin', `${style.focusX}% ${style.focusY}%`);
    }
    frame.appendChild(picture);
    return frame;
  },
};
