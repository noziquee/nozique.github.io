import type { NoziqueClient } from '../../shared/supabase/client';
import { loadDesign } from '../../shared/design';
import type { Design } from '../../shared/design';

type DbClient = Pick<NoziqueClient, 'from'>;

export interface SectionData {
  key: string;
  enabled: boolean;
  sortOrder: number;
  /** The section's design, or null (none or invalid): the built-in version is used. */
  design: Design | null;
}

export type Sections = Record<string, SectionData>;

export interface SectionRow {
  section_key: string;
  enabled: boolean;
  sort_order: number;
  content: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Turn database rows into sections. A section's design lives in `content.design`. Anything
 * invalid is ignored (with a note through onProblem) so one bad edit can never break the page.
 */
export function mapSections(
  rows: readonly SectionRow[],
  onProblem: (message: string) => void = () => {},
): Sections {
  const sections: Sections = {};
  for (const row of rows) {
    let design: Design | null = null;
    if (isObject(row.content) && row.content['design'] !== undefined) {
      const result = loadDesign(row.content['design']);
      if (result.ok) design = result.design;
      else onProblem(`Section "${row.section_key}" has an invalid design: ${result.errors[0]}`);
    }
    sections[row.section_key] = {
      key: row.section_key,
      enabled: row.enabled,
      sortOrder: row.sort_order,
      design,
    };
  }
  return sections;
}

/** Read the published sections. Visitors can only ever see published content. */
export async function fetchSections(client: DbClient): Promise<SectionRow[]> {
  const { data, error } = await client
    .from('site_sections')
    .select('section_key, enabled, sort_order, content')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

/** Never throws: if sections cannot be loaded, the built-in page is shown. */
export async function loadSections(getClient: () => DbClient, timeoutMs = 4000): Promise<Sections> {
  try {
    const rows = await Promise.race([
      fetchSections(getClient()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out loading sections')), timeoutMs),
      ),
    ]);
    return mapSections(rows, (message) => console.warn(message));
  } catch {
    return {};
  }
}
