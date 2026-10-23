// Website sections that come from the database (Phase 5.6). The old page code reads SECTIONS
// to decide between a section's design and its built-in version.
import { mountDesign, registerBuiltInElements } from '../../shared/design/render';

export const SECTIONS = {};

export function useSections(sections) {
  for (const key of Object.keys(SECTIONS)) delete SECTIONS[key];
  Object.assign(SECTIONS, sections);
}

let mounted = [];

/** Draw every section design placeholder (<... data-design="hero">) now on the page. */
export function mountSectionDesigns() {
  mounted.forEach((item) => item.destroy());
  mounted = [];
  registerBuiltInElements();
  document.querySelectorAll('[data-design]').forEach((host) => {
    const section = SECTIONS[host.dataset.design];
    if (section && section.design) mounted.push(mountDesign(host, section.design));
  });
}
