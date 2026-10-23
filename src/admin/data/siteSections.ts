import { getSupabase } from '../../shared/supabase/client';
import type { Row } from '../../shared/supabase/database.types';

export type SectionSummary = Pick<
  Row<'site_sections'>,
  'section_key' | 'name' | 'enabled' | 'reorderable' | 'sort_order' | 'published_at'
> & {
  /** True when the section has unpublished changes. */
  hasDraft: boolean;
};

export async function listSections(): Promise<SectionSummary[]> {
  const db = getSupabase();
  const [sections, drafts] = await Promise.all([
    db
      .from('site_sections')
      .select('section_key, name, enabled, reorderable, sort_order, published_at')
      .order('sort_order'),
    db.from('site_section_drafts').select('section_key'),
  ]);
  if (sections.error) throw new Error(sections.error.message);
  if (drafts.error) throw new Error(drafts.error.message);
  const withDraft = new Set(drafts.data.map((draft) => draft.section_key));
  return sections.data.map((section) => ({
    ...section,
    hasDraft: withDraft.has(section.section_key),
  }));
}

export async function setSectionEnabled(key: string, enabled: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from('site_sections')
    .update({ enabled })
    .eq('section_key', key);
  if (error) throw new Error(error.message);
}

export async function saveSectionOrder(
  updates: readonly { key: string; sortOrder: number }[],
): Promise<void> {
  const db = getSupabase();
  const results = await Promise.all(
    updates.map(({ key, sortOrder }) =>
      db.from('site_sections').update({ sort_order: sortOrder }).eq('section_key', key),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
}
