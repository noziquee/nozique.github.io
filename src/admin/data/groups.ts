import { getSupabase } from '../../shared/supabase/client';
import type { Row } from '../../shared/supabase/database.types';

export type Group = Row<'groups'>;

export interface GroupWithCount extends Group {
  /** Projects in this category, drafts included. */
  projectCount: number;
}

interface DbError {
  code?: string;
  message: string;
}

function fail(error: DbError): never {
  if (error.code === '23505') throw new Error('A category with that name already exists.');
  throw new Error(error.message);
}

export async function listGroups(): Promise<GroupWithCount[]> {
  const db = getSupabase();
  const [groups, posts] = await Promise.all([
    db.from('groups').select('*').order('sort_order', { nullsFirst: false }).order('created_at'),
    db.from('posts').select('group_id'),
  ]);
  if (groups.error) fail(groups.error);
  if (posts.error) fail(posts.error);

  const counts = new Map<string, number>();
  for (const post of posts.data) {
    if (post.group_id) counts.set(post.group_id, (counts.get(post.group_id) ?? 0) + 1);
  }
  return groups.data.map((group) => ({ ...group, projectCount: counts.get(group.id) ?? 0 }));
}

export async function createGroup(name: string, sortOrder: number): Promise<void> {
  const { error } = await getSupabase().from('groups').insert({ name, sort_order: sortOrder });
  if (error) fail(error);
}

export async function renameGroup(id: string, name: string): Promise<void> {
  const { error } = await getSupabase().from('groups').update({ name }).eq('id', id);
  if (error) fail(error);
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await getSupabase().from('groups').delete().eq('id', id);
  if (error) fail(error);
}

/** Save the order shown on screen: the first id gets 0, the next 1, and so on. */
export async function saveGroupOrder(ids: readonly string[]): Promise<void> {
  const db = getSupabase();
  const results = await Promise.all(
    ids.map((id, index) => db.from('groups').update({ sort_order: index }).eq('id', id)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) fail(failed.error);
}
