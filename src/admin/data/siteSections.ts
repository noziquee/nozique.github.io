import { getSupabase } from '../../shared/supabase/client';
import type { Row } from '../../shared/supabase/database.types';
import { pickSectionDesign } from './sectionDesign';
import type { PickedDesign } from './sectionDesign';

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

export interface SectionForEditing {
  key: string;
  name: string;
  picked: PickedDesign;
}

/** Read one section and its draft (if any) for the visual editor. */
export async function loadSectionForEditing(key: string): Promise<SectionForEditing> {
  const db = getSupabase();
  const [section, draft] = await Promise.all([
    db.from('site_sections').select('name, content').eq('section_key', key).maybeSingle(),
    db.from('site_section_drafts').select('draft_content').eq('section_key', key).maybeSingle(),
  ]);
  if (section.error) throw new Error(section.error.message);
  if (draft.error) throw new Error(draft.error.message);
  if (!section.data) throw new Error('That section does not exist.');
  const picked = pickSectionDesign(section.data.content, draft.data?.draft_content);
  return { key, name: section.data.name, picked };
}
