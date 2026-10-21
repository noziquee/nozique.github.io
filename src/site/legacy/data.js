// Bridge between the typed data layer (src/site/data) and the old page modules.
// P (projects) and CAT (categories) are filled in place by useSiteData() before the first render.
import { applyToLegacy } from '../data/legacyAdapter';
import { placeholderData } from '../data/source';

export const CAT = {};
export const P = [];

export function useSiteData(data) {
  applyToLegacy(data, P, CAT);
}

useSiteData(placeholderData());
