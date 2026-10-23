import type { ShapeElement } from '../../types';
import type { ElementDefinition } from '../registry';

export const shapeElement: ElementDefinition<ShapeElement> = {
  type: 'shape',
  render(element, context) {
    const { style } = element;
    const node = context.document.createElement('div');
    node.setAttribute('class', 'design-shape');
    const set = (name: string, value: string) => node.style.setProperty(name, value);
    set('width', '100%');
    set('height', '100%');
    set('box-sizing', 'border-box');
    set('background', style.fill);
    set('border-radius', element.shape === 'ellipse' ? '50%' : `${style.radius}px`);
    if (style.stroke && style.strokeWidth > 0) {
      set('border', `${style.strokeWidth}px solid ${style.stroke}`);
    }
    return node;
  },
};
