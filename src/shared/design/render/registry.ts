import type { DesignElement, Layout, LayoutName } from '../types';

/** What an element definition gets while drawing. */
export interface RenderContext {
  document: Document;
  layoutName: LayoutName;
  layout: Layout;
}

/**
 * One element type: how to draw it. To add a new kind of element, write one definition file
 * and register it. The renderer, the editor and the tests find it through the registry.
 */
export interface ElementDefinition<E extends DesignElement = DesignElement> {
  type: E['type'];
  /**
   * Build the inside of the element. Use DOM calls such as `textContent` and `style`, never
   * `innerHTML`, so text can never turn into markup. Position, size, rotation, opacity and
   * visibility are applied by the renderer around what you return.
   */
  render(element: E, context: RenderContext): HTMLElement;
}

export interface ElementRegistry {
  register<E extends DesignElement>(definition: ElementDefinition<E>): void;
  get(type: string): ElementDefinition | undefined;
  has(type: string): boolean;
  types(): string[];
}

export function createRegistry(): ElementRegistry {
  const definitions = new Map<string, ElementDefinition>();
  return {
    register(definition) {
      if (definitions.has(definition.type)) {
        throw new Error(`An element type named "${definition.type}" is already registered.`);
      }
      // A definition for one element type is stored with the general type; the renderer only
      // ever calls it with elements of that type.
      definitions.set(definition.type, definition as unknown as ElementDefinition);
    },
    get: (type) => definitions.get(type),
    has: (type) => definitions.has(type),
    types: () => [...definitions.keys()],
  };
}

/** The registry the public site and the editor share. Element files register themselves here. */
export const defaultRegistry: ElementRegistry = createRegistry();
