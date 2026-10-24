export type NameCheck = { ok: true; name: string } | { ok: false; error: string };

const MAX_NAME = 80;

/** Tidy a category name typed by the admin and check it against the database rules. */
export function cleanGroupName(raw: string): NameCheck {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (!name) return { ok: false, error: 'Enter a name.' };
  if (name.length > MAX_NAME) return { ok: false, error: `Keep it under ${MAX_NAME} characters.` };
  return { ok: true, name };
}

/** True when another category already uses this name (ignoring case). */
export function isDuplicateName(
  name: string,
  groups: readonly { id: string; name: string }[],
  ignoreId?: string,
): boolean {
  const wanted = name.toLowerCase();
  return groups.some((g) => g.id !== ignoreId && g.name.toLowerCase() === wanted);
}

/** The sort number for a new category: one after the current last one. */
export function nextSortOrder(groups: readonly { sort_order: number | null }[]): number {
  return groups.reduce((max, g) => Math.max(max, g.sort_order ?? -1), -1) + 1;
}
