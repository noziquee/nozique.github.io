const STYLE_ID = 'nozique-design-styles';

/**
 * The few rules that inline styles cannot express (hover and keyboard focus). The text is fixed
 * and contains nothing from a design; colours reach it through custom properties.
 */
const CSS = `
.design-button{display:flex;align-items:center;justify-content:center;box-sizing:border-box;
width:100%;height:100%;padding:0 12px;text-align:center;text-decoration:none;cursor:pointer;
overflow:hidden;transition:background-color .15s,color .15s,border-color .15s}
.design-button:hover{background-color:var(--db-hover-fill,var(--db-fill))!important;
color:var(--db-hover-color,var(--db-color))!important}
.design-button:focus-visible{outline:3px solid currentColor;outline-offset:3px}
`;

/** Add the stylesheet once per page. Does nothing where there is no real page (tests). */
export function ensureDesignStyles(doc: Document): void {
  if (typeof doc.getElementById !== 'function' || !doc.head) return;
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}
