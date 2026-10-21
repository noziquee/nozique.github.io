import type { Row } from '../../shared/supabase/database.types';
import { DEFAULT_CATEGORIES, categoryKey } from './categories';
import type { Aspect, Category, Project, ProjectImage, SiteData } from './types';

export type GroupRow = Row<'groups'>;
export type PostRow = Row<'posts'>;
export type ImageRow = Row<'post_images'>;

const ASPECTS: readonly string[] = ['1/1', '4/5', '4/3', '16/9', '3/4'];

/** Only https links may be used for images and videos coming from the database. */
export function safeUrl(url: string | null | undefined): string {
  const value = (url ?? '').trim();
  return /^https:\/\//i.test(value) ? value : '';
}

/** Small stable number from text, used to vary generated placeholder art. */
export function seedFrom(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return hash + 1;
}

/** A slug is only used in links when it is plain letters, digits and dashes. */
export function safeId(slug: string | null, fallback: string): string {
  const value = slug?.trim() ?? '';
  return /^[a-z0-9][a-z0-9-]*$/i.test(value) ? value : fallback;
}

function asAspect(value: string): Aspect {
  return (ASPECTS.includes(value) ? value : '4/5') as Aspect;
}

/** Convert one database post (plus its images) into a Project. */
export function mapPost(post: PostRow, images: ImageRow[], groups: Map<string, GroupRow>): Project {
  const group = post.group_id ? groups.get(post.group_id) : undefined;
  const gallery: ProjectImage[] = images
    .filter((image) => safeUrl(image.url))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      src: safeUrl(image.url),
      alt: image.alt ?? '',
      caption: image.caption ?? '',
    }));
  return {
    id: safeId(post.slug, post.id),
    title: post.title,
    category: group ? categoryKey(group.name) : 'other',
    year: post.year ?? new Date(post.created_at).getFullYear(),
    tools: post.tools ?? '',
    role: post.role ?? '',
    description: post.description ?? '',
    aspect: asAspect(post.aspect),
    featured: post.featured,
    cover: gallery[0] ?? null,
    gallery,
    video: safeUrl(post.video_url),
    seed: seedFrom(post.id),
  };
}

/** Build the whole site data set from raw database rows. */
export function mapRows(groups: GroupRow[], posts: PostRow[], images: ImageRow[]): SiteData {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const imagesByPost = new Map<string, ImageRow[]>();
  for (const image of images) {
    const list = imagesByPost.get(image.post_id) ?? [];
    list.push(image);
    imagesByPost.set(image.post_id, list);
  }
  const projects = posts.map((post) => mapPost(post, imagesByPost.get(post.id) ?? [], groupById));

  const sortedGroups = [...groups].sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9));
  const categories: Category[] = sortedGroups.map((group) => ({
    key: categoryKey(group.name),
    label: group.name,
  }));
  const hasOther = projects.some((project) => project.category === 'other');
  if (hasOther && !categories.some((category) => category.key === 'other')) {
    categories.push({ key: 'other', label: 'Other' });
  }
  return {
    projects,
    categories: categories.length ? categories : [...DEFAULT_CATEGORIES],
    source: 'database',
  };
}
