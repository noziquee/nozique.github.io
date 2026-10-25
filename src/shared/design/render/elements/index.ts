import type { ElementDefinition, ElementRegistry } from '../registry';
import { defaultRegistry } from '../registry';
import { buttonElement } from './button';
import { iconElement } from './icon';
import { imageElement } from './image';
import { shapeElement } from './shape';
import { textElement } from './text';

/** Every element type that comes with the editor. Add new ones here, one per step. */
export const builtInElements: readonly ElementDefinition[] = [
  textElement as unknown as ElementDefinition,
  shapeElement as unknown as ElementDefinition,
  imageElement as unknown as ElementDefinition,
  buttonElement as unknown as ElementDefinition,
  iconElement as unknown as ElementDefinition,
];

/** Make the built-in element types available. Safe to call more than once. */
export function registerBuiltInElements(registry: ElementRegistry = defaultRegistry): void {
  for (const definition of builtInElements) {
    if (!registry.has(definition.type)) registry.register(definition);
  }
}

export { buttonElement, iconElement, imageElement, shapeElement, textElement };
