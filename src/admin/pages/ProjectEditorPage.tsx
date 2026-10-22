import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { listGroups } from '../data/groups';
import type { Group } from '../data/groups';
import { createProject, getProject, updateProject } from '../data/projects';
import {
  ASPECTS,
  EMPTY_FORM,
  formFromRow,
  hasErrors,
  sameForm,
  slugify,
  toRow,
  validateForm,
} from '../data/projectRules';
import type { FormErrors, ProjectForm } from '../data/projectRules';
import { adminHref, projectHref } from '../routing';
import type { ProjectRoute } from '../routing';
import { ErrorMessage, Loading } from '../ui/states';
import { ProjectImages } from './ProjectImages';

/** Set when a project was just created, so the next editor page can say so. */
let justCreated = false;

function newSlug(title: string): string {
  return `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function ProjectEditorPage({ route }: { route: ProjectRoute }) {
  const id = route.kind === 'edit' ? route.id : null;
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [saved, setSaved] = useState<ProjectForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const [allGroups, row] = await Promise.all([listGroups(), id ? getProject(id) : null]);
        if (cancelled) return;
        setGroups(allGroups);
        if (id && !row) {
          setState('missing');
          return;
        }
        const loaded = row ? formFromRow(row) : EMPTY_FORM;
        setForm(loaded);
        setSaved(loaded);
        if (justCreated) setNotice('Project created as a draft.');
        justCreated = false;
        setState('ready');
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Something went wrong.');
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const dirty = !sameForm(form, saved);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function set<K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateForm(form);
    setErrors(found);
    if (hasErrors(found)) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (id) {
        await updateProject(id, toRow(form));
        setSaved(form);
        setNotice('Saved.');
      } else {
        const newId = await createProject(toRow(form), newSlug(form.title));
        justCreated = true;
        setSaved(form);
        window.location.hash = projectHref(newId);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    window.location.hash = adminHref('projects');
  }

  if (state === 'loading') return <Loading label="Loading project…" />;
  if (state === 'error') {
    return (
      <ErrorMessage title="Could not load this project" onRetry={() => setAttempt((n) => n + 1)}>
        {loadError}
      </ErrorMessage>
    );
  }
  if (state === 'missing') {
    return (
      <ErrorMessage title="Project not found">
        It may have been deleted. <a href={adminHref('projects')}>Back to Projects</a>
      </ErrorMessage>
    );
  }

  return (
    <section>
      <p>
        <a href={adminHref('projects')}>← Projects</a>
      </p>
      <h1>{id ? 'Edit project' : 'New project'}</h1>
      {!id && (
        <p className="muted">New projects start as drafts. Nothing shows on your site yet.</p>
      )}

      <form className="editor" onSubmit={onSubmit} noValidate>
        <label htmlFor="p-title">Title</label>
        <input
          id="p-title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          aria-invalid={errors.title ? true : undefined}
        />
        {errors.title && <p className="error">{errors.title}</p>}

        <label htmlFor="p-desc">Description</label>
        <textarea
          id="p-desc"
          rows={6}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
        {errors.description && <p className="error">{errors.description}</p>}

        <div className="field-grid">
          <div>
            <label htmlFor="p-group">Category</label>
            <select
              id="p-group"
              value={form.groupId}
              onChange={(e) => set('groupId', e.target.value)}
            >
              <option value="">No category</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="p-year">Year</label>
            <input
              id="p-year"
              inputMode="numeric"
              value={form.year}
              onChange={(e) => set('year', e.target.value)}
              aria-invalid={errors.year ? true : undefined}
            />
            {errors.year && <p className="error">{errors.year}</p>}
          </div>
        </div>

        <div className="field-grid">
          <div>
            <label htmlFor="p-tools">Tools</label>
            <input
              id="p-tools"
              placeholder="Blender, Photoshop"
              value={form.tools}
              onChange={(e) => set('tools', e.target.value)}
            />
            {errors.tools && <p className="error">{errors.tools}</p>}
          </div>
          <div>
            <label htmlFor="p-role">Your role</label>
            <input
              id="p-role"
              placeholder="Concept, modeling"
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
            />
            {errors.role && <p className="error">{errors.role}</p>}
          </div>
        </div>

        <label htmlFor="p-aspect">Card shape</label>
        <select id="p-aspect" value={form.aspect} onChange={(e) => set('aspect', e.target.value)}>
          {ASPECTS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>

        {saveError && (
          <p className="error" role="alert">
            {saveError}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : id ? 'Save changes' : 'Create project'}
          </button>
          <button type="button" onClick={onCancel} disabled={saving}>
            {dirty ? 'Cancel' : 'Back'}
          </button>
          {dirty && <span className="muted">Unsaved changes</span>}
        </div>
      </form>

      {id ? (
        <ProjectImages postId={id} />
      ) : (
        <p className="muted">Create the project first, then you can add images.</p>
      )}
    </section>
  );
}
