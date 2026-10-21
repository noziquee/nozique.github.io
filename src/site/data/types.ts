/** Category keys used in URLs, filters and card styling. Custom categories get a slug. */
export type CategoryKey = string;

export type Aspect = '1/1' | '4/5' | '4/3' | '16/9' | '3/4';

export interface ProjectImage {
  src: string;
  alt: string;
  caption: string;
}

/** One portfolio project, in the shape the public site works with. */
export interface Project {
  id: string;
  title: string;
  category: CategoryKey;
  year: number;
  tools: string;
  role: string;
  description: string;
  aspect: Aspect;
  featured: boolean;
  /** First image (thumbnail). Null for placeholder projects, which draw generated art. */
  cover: ProjectImage | null;
  /** All images in order, including the cover. */
  gallery: ProjectImage[];
  video: string;
  /** Number that makes generated placeholder art look different per project. */
  seed: number;
}

export interface Category {
  key: CategoryKey;
  label: string;
}

export interface SiteData {
  projects: Project[];
  categories: Category[];
  /** Where the data came from: the database, or the built-in placeholders. */
  source: 'database' | 'placeholder';
}
