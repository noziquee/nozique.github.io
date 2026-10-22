export const NAME_MAX = 80;

interface Named {
  id: string;
  name: string;
}

/** Returns a message to show the user, or null when the name is fine. */
export function validateCategoryName(
  name: string,
  existing: readonly Named[],
  selfId?: string,
): string | null {
  const clean = name.trim();
  if (!clean) return 'Enter a name.';
  if (clean.length > NAME_MAX) return `Keep the name under ${NAME_MAX} characters.`;
  const clash = existing.some(
    (item) => item.id !== selfId && item.name.trim().toLowerCase() === clean.toLowerCase(),
  );
  return clash ? 'A category with this name already exists.' : null;
}

/** The sort number for a category added at the end of the list. */
export function nextSortOrder(items: readonly { sort_order: number | null }[]): number {
  return items.reduce((max, item) => Math.max(max, item.sort_order ?? -1), -1) + 1;
}

/** Move the item with id `activeId` to where the item `overId` is. Returns a new list. */
export function moveById<T extends { id: string }>(
  items: readonly T[],
  activeId: string,
  overId: string,
): T[] {
  const from = items.findIndex((item) => item.id === activeId);
  const to = items.findIndex((item) => item.id === overId);
  const next = [...items];
  if (from < 0 || to < 0 || from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}
