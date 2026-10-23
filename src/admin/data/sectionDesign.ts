import { createEmptyDesign, loadDesign } from '../../shared/design';
import type { Design } from '../../shared/design';

/** Where the design being edited came from. 'none' means the section has no design yet. */
export type DesignSource = 'draft' | 'published' | 'none';

export type PickedDesign =
  | { ok: true; design: Design; source: DesignSource }
  | { ok: false; source: DesignSource; errors: string[] };

function designOf(content: unknown): unknown {
  if (typeof content !== 'object' || content === null || Array.isArray(content)) return undefined;
  return (content as Record<string, unknown>).design;
}

/**
 * Decide what the editor opens: the unpublished draft if there is one, otherwise the live
 * content. A section without a design starts as a blank one. A broken design is reported,
 * never silently replaced.
 */
export function pickSectionDesign(
  content: unknown,
  draftContent: unknown | null | undefined,
): PickedDesign {
  const hasDraft = draftContent !== null && draftContent !== undefined;
  const raw = designOf(hasDraft ? draftContent : content);
  const found = raw !== undefined;
  const source: DesignSource = !found ? 'none' : hasDraft ? 'draft' : 'published';
  if (!found) return { ok: true, design: createEmptyDesign(), source };
  const loaded = loadDesign(raw);
  if (!loaded.ok) return { ok: false, source, errors: loaded.errors };
  return { ok: true, design: loaded.design, source };
}
