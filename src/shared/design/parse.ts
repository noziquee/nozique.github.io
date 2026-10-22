import type { ZodIssue } from 'zod';
import { migrateDesign } from './migrate';
import { CURRENT_DESIGN_VERSION, designSchema } from './schema';
import type { Design } from './types';

export type LoadResult =
  | { ok: true; design: Design; migratedFrom: number | null }
  | { ok: false; errors: string[] };

function describe(issue: ZodIssue): string {
  const where = issue.path.length > 0 ? issue.path.join('.') : 'design';
  return `${where}: ${issue.message}`;
}

/** Check a design that is already at the current version. */
export function parseDesign(raw: unknown): LoadResult {
  const result = designSchema.safeParse(raw);
  if (!result.success) return { ok: false, errors: result.error.issues.map(describe) };
  return { ok: true, design: result.data, migratedFrom: null };
}

/**
 * Turn anything read from the database (or a file) into a safe, current design:
 * upgrade old versions first, then validate. Never throws.
 */
export function loadDesign(raw: unknown): LoadResult {
  const migrated = migrateDesign(raw);
  if (!migrated.ok) return { ok: false, errors: [migrated.error] };
  const parsed = parseDesign(migrated.raw);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    design: parsed.design,
    migratedFrom: migrated.from === CURRENT_DESIGN_VERSION ? null : migrated.from,
  };
}

/** A blank design: an empty desktop layout. */
export function createEmptyDesign(): Design {
  return {
    version: CURRENT_DESIGN_VERSION,
    layouts: { desktop: { width: 1200, height: 600, elements: [] } },
  };
}
