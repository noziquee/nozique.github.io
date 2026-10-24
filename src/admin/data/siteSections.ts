import { getSupabase } from '../../shared/supabase/client';
import type { Json, Row } from '../../shared/supabase/database.types';
import { hasDesign, pickSectionDesign, withoutDesign } from './sectionDesign';
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
  /** The published content (what visitors get). */
  content: unknown;
  publishedAt: string;
  /** True when an unpublished draft is saved. */
  hasDraft: boolean;
  /** True when the live section is drawn from a design (not the built-in version). */
  hasPublishedDesign: boolean;
}

/** Read one section and its draft (if any) for the visual editor. */
export async function loadSectionForEditing(key: string): Promise<SectionForEditing> {
  const db = getSupabase();
  const [section, draft] = await Promise.all([
    db
      .from('site_sections')
      .select('name, content, published_at')
      .eq('section_key', key)
      .maybeSingle(),
    db.from('site_section_drafts').select('draft_content').eq('section_key', key).maybeSingle(),
  ]);
  if (section.error) throw new Error(section.error.message);
  if (draft.error) throw new Error(draft.error.message);
  if (!section.data) throw new Error('That section does not exist.');
  const picked = pickSectionDesign(section.data.content, draft.data?.draft_content);
  return {
    key,
    name: section.data.name,
    picked,
    content: section.data.content,
    publishedAt: section.data.published_at,
    hasDraft: draft.data !== null,
    hasPublishedDesign: hasDesign(section.data.content),
  };
}

/** Plain JSON for the database: drops anything that is not data (such as undefined). */
function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

/** Save the work in progress. The live site does not change. */
export async function saveSectionDraft(
  key: string,
  content: Record<string, unknown>,
  basedOn: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from('site_section_drafts')
    .upsert(
      { section_key: key, draft_content: toJson(content), based_on: basedOn },
      { onConflict: 'section_key' },
    );
  if (error) throw new Error(error.message);
}

/** Make the saved draft the live version (done inside the database in one step). */
export async function publishSection(key: string): Promise<void> {
  const { error } = await getSupabase().rpc('publish_section', { p_key: key });
  if (error) throw new Error(error.message);
}

export async function discardSectionDraft(key: string): Promise<void> {
  const { error } = await getSupabase().from('site_section_drafts').delete().eq('section_key', key);
  if (error) throw new Error(error.message);
}

/** Take the design off the live section so the built-in version is used again. */
export async function removePublishedDesign(key: string, content: unknown): Promise<void> {
  const { error } = await getSupabase()
    .from('site_sections')
    .update({ content: toJson(withoutDesign(content)), published_at: new Date().toISOString() })
    .eq('section_key', key);
  if (error) throw new Error(error.message);
}
