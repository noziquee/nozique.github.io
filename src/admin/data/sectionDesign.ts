import { createEmptyDesign, loadDesign, parseDesign } from '../../shared/design';
import type { Design } from '../../shared/design';

/** Where the design being edited came from. 'none' means the section has no design yet. */
export type DesignSource = 'draft' | 'published' | 'none';

export type PickedDesign =
  | { ok: true; design: Design; source: DesignSource }
  | { ok: false; source: DesignSource; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function designOf(content: unknown): unknown {
  return isRecord(content) ? content.design : undefined;
}

/** True when the content has a design (valid or not). */
export function hasDesign(content: unknown): boolean {
  return designOf(content) !== undefined;
}

/** The content with its design removed. Everything else in it stays. */
export function withoutDesign(content: unknown): Record<string, unknown> {
  if (!isRecord(content)) return {};
  return Object.fromEntries(Object.entries(content).filter(([key]) => key !== 'design'));
}

export type DraftContent =
  | { ok: true; content: Record<string, unknown> }
  | { ok: false; errors: string[] };

/**
 * The content to store as a draft: the section's current content with the edited design in it.
 * The design is checked first, so an invalid one can never be saved.
 */
export function buildDraftContent(content: unknown, design: unknown): DraftContent {
  const checked = parseDesign(design);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  return { ok: true, content: { ...withoutDesign(content), design: checked.design } };
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
