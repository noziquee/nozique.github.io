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

/** True unless the admin switched this section off. Sections the database doesn't know are on. */
export function isOn(key) {
  const section = SECTIONS[key];
  return !(section && section.enabled === false);
}

/** The given section keys in the order the admin chose; any the database lacks keep their place. */
export function homeOrder(defaults) {
  const rank = (key) => (SECTIONS[key] ? SECTIONS[key].sortOrder : Number.MAX_SAFE_INTEGER);
  return defaults
    .map((key, index) => ({ key, index }))
    .sort((a, b) => rank(a.key) - rank(b.key) || a.index - b.index)
    .map((item) => item.key);
}

/** Hide the About and Contact links in the menus while those sections are switched off. */
export function applyNavVisibility() {
  document.querySelectorAll('[data-p="about"], [data-p="contact"]').forEach((link) => {
    link.hidden = !isOn(link.dataset.p);
  });
}
