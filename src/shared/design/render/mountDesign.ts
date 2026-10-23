import type { Design, LayoutName } from '../types';
import { renderDesign } from './renderDesign';
import type { RenderOptions } from './renderDesign';
import { DEFAULT_BREAKPOINT, chooseLayoutName, pickLayout, scaleFor } from './responsive';

export interface MountOptions extends Omit<RenderOptions, 'layout'> {
  /** Hosts this wide or narrower get the phone layout. Default 700. */
  breakpoint?: number;
}

export interface MountedDesign {
  /** Draw again, for example after the design was edited. */
  update(design: Design): void;
  /** Stop watching the host's size. */
  destroy(): void;
  layoutName(): LayoutName;
}

/**
 * Put a design into a page element and keep it responsive: narrow hosts get the phone layout,
 * and a layout wider than the host is shrunk to fit. Redraws itself when the host is resized.
 */
export function mountDesign(
  host: HTMLElement,
  initial: Design,
  options: MountOptions = {},
): MountedDesign {
  const breakpoint = options.breakpoint ?? DEFAULT_BREAKPOINT;
  let design = initial;
  let current: LayoutName = 'desktop';
  let lastWidth = -1;

  function draw() {
    const width = host.clientWidth;
    const name = chooseLayoutName(width, breakpoint);
    const { layout } = pickLayout(design, name);
    const scale = scaleFor(width, layout.width);

    const root = renderDesign(design, { ...options, layout: name });
    root.style.transformOrigin = 'top left';
    root.style.transform = scale === 1 ? '' : `scale(${scale})`;

    const fit = host.ownerDocument.createElement('div');
    fit.className = 'design-fit';
    fit.style.width = `${layout.width * scale}px`;
    fit.style.height = `${layout.height * scale}px`;
    fit.style.overflow = 'hidden';
    fit.style.margin = '0 auto';
    fit.appendChild(root);
    host.replaceChildren(fit);
    current = name;
    lastWidth = width;
  }

  const onResize = () => {
    if (host.clientWidth !== lastWidth) draw();
  };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
  if (observer) observer.observe(host);
  else window.addEventListener('resize', onResize);
  draw();

  return {
    update(next) {
      design = next;
      draw();
    },
    destroy() {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
    },
    layoutName: () => current,
  };
}
