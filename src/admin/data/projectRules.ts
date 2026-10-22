import type { Row } from '../../shared/supabase/database.types';

export const ASPECTS = [
  { value: '4/5', label: 'Portrait (4:5)' },
  { value: '3/4', label: 'Tall portrait (3:4)' },
  { value: '1/1', label: 'Square (1:1)' },
  { value: '4/3', label: 'Landscape (4:3)' },
  { value: '16/9', label: 'Wide (16:9)' },
] as const;

/** What the editor form holds. Everything is text until it is saved. */
export interface ProjectForm {
  title: string;
  description: string;
  groupId: string;
  year: string;
  tools: string;
  role: string;
  aspect: string;
}

export const EMPTY_FORM: ProjectForm = {
  title: '',
  description: '',
  groupId: '',
  year: String(new Date().getFullYear()),
  tools: '',
  role: '',
  aspect: '4/5',
};

export type FormErrors = Partial<Record<keyof ProjectForm, string>>;

export function validateForm(form: ProjectForm): FormErrors {
  const errors: FormErrors = {};
  const title = form.title.trim();
  if (!title) errors.title = 'Enter a title.';
  else if (title.length > 120) errors.title = 'Keep the title under 120 characters.';

  const year = form.year.trim();
  if (year && !(/^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 2100)) {
    errors.year = 'Enter a four-digit year, or leave it empty.';
  }
  if (form.tools.length > 200) errors.tools = 'Keep tools under 200 characters.';
  if (form.role.length > 120) errors.role = 'Keep the role under 120 characters.';
  if (form.description.length > 5000) {
    errors.description = 'Keep the description under 5000 characters.';
  }
  if (!ASPECTS.some((a) => a.value === form.aspect)) errors.aspect = 'Choose a shape.';
  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** The values stored in the database for a valid form. */
export function toRow(form: ProjectForm) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    group_id: form.groupId || null,
    year: form.year.trim() ? Number(form.year.trim()) : null,
    tools: form.tools.trim() || null,
    role: form.role.trim() || null,
    aspect: form.aspect,
  };
}

export type ProjectValues = ReturnType<typeof toRow>;

export function formFromRow(row: Row<'posts'>): ProjectForm {
  return {
    title: row.title,
    description: row.description ?? '',
    groupId: row.group_id ?? '',
    year: row.year ? String(row.year) : '',
    tools: row.tools ?? '',
    role: row.role ?? '',
    aspect: row.aspect,
  };
}

export function sameForm(a: ProjectForm, b: ProjectForm): boolean {
  return (Object.keys(a) as (keyof ProjectForm)[]).every((key) => a[key] === b[key]);
}

/** Letters and digits only, joined by dashes. Used for the project's web address. */
export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug || 'project';
}
