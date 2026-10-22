import { getSupabase } from '../../../shared/supabase/client';
import type { Row } from '../../../shared/supabase/database.types';

export type Category = Row<'groups'> & { projectCount: number };

function fail(error: { message: string; code?: string }): never {
  throw new Error(
    error.code === '23505' ? 'A category with this name already exists.' : error.message,
  );
}

export async function listCategories(): Promise<Category[]> {
  const db = getSupabase();
  const [groups, posts] = await Promise.all([
    db.from('groups').select('*').order('sort_order', { nullsFirst: false }).order('name'),
    db.from('posts').select('group_id'),
  ]);
  if (groups.error) return fail(groups.error);
  if (posts.error) return fail(posts.error);

  const counts = new Map<string, number>();
  for (const post of posts.data) {
    if (post.group_id) counts.set(post.group_id, (counts.get(post.group_id) ?? 0) + 1);
  }
  return groups.data.map((group) => ({ ...group, projectCount: counts.get(group.id) ?? 0 }));
}

export async function createCategory(name: string, sortOrder: number): Promise<void> {
  const { error } = await getSupabase()
    .from('groups')
    .insert({ name: name.trim(), sort_order: sortOrder });
  if (error) fail(error);
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const { error } = await getSupabase().from('groups').update({ name: name.trim() }).eq('id', id);
  if (error) fail(error);
}

/** Projects in a deleted category are kept; they just lose their category. */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await getSupabase().from('groups').delete().eq('id', id);
  if (error) fail(error);
}

/** Save the order: the first id gets 0, the next 1, and so on. */
export async function saveCategoryOrder(ids: readonly string[]): Promise<void> {
  const db = getSupabase();
  const results = await Promise.all(
    ids.map((id, index) => db.from('groups').update({ sort_order: index }).eq('id', id)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) fail(failed.error);
}
