import type { Design, DesignElement } from '../../shared/design';

export interface ElementPatch {
  position?: DesignElement['position'];
  size?: DesignElement['size'];
  rotation?: number;
}

/** A copy of the design with one desktop element changed. Unknown ids change nothing. */
export function updateElement(design: Design, id: string, patch: ElementPatch): Design {
  const { desktop } = design.layouts;
  return {
    ...design,
    layouts: {
      ...design.layouts,
      desktop: {
        ...desktop,
        elements: desktop.elements.map(
          (element): DesignElement => (element.id === id ? { ...element, ...patch } : element),
        ),
      },
    },
  };
}

export function findElement(design: Design, id: string): DesignElement | undefined {
  return design.layouts.desktop.elements.find((element) => element.id === id);
}
