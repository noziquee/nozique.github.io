import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { notifyProjectsChanged } from '../data/events';
import { listGroups } from '../data/groups';
import type { Group } from '../data/groups';
import {
  createProject,
  deleteProject,
  getProject,
  setFeatured,
  setPublished,
  updateProject,
} from '../data/projects';
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
import { Dialog } from '../ui/Dialog';
import { PublishControls } from '../ui/PublishControls';
import { ErrorMessage, Loading } from '../ui/states';
import { ProjectImages } from './ProjectImages';
import { ProjectVideo } from './ProjectVideo';

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
  const [meta, setMeta] = useState({ status: 'draft', featured: false });
  const [metaBusy, setMetaBusy] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

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
        if (row) setMeta({ status: row.status, featured: row.featured });
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

  // When the dialog closes, tell the project list behind it to refresh.
  useEffect(() => () => notifyProjectsChanged(), []);

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
        notifyProjectsChanged();
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

  async function changeMeta(next: Partial<typeof meta>, save: () => Promise<void>) {
    setMetaBusy(true);
    setMetaError(null);
    try {
      await save();
      setMeta((current) => ({ ...current, ...next }));
      notifyProjectsChanged();
    } catch (error) {
      setMetaError(error instanceof Error ? error.message : 'Could not save the change.');
    }
    setMetaBusy(false);
  }

  async function onDelete() {
    if (!id) return;
    const message = `Delete “${saved.title}”? Its images and video are deleted too.`;
    if (!window.confirm(`${message} This cannot be undone.`)) return;
    setSaving(true);
    setSaveError(null);
    try {
      await deleteProject(id);
      notifyProjectsChanged();
      setSaved(form);
      window.location.hash = adminHref('projects');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not delete the project.');
      setSaving(false);
    }
  }

  function onCancel() {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    window.location.hash = adminHref('projects');
  }

  const title = id ? 'Edit project' : 'New project';
  const inDialog = (content: ReactNode) => (
    <Dialog label={title} onClose={onCancel}>
      <div className="dialog-pad">{content}</div>
    </Dialog>
  );

  if (state === 'loading') return inDialog(<Loading label="Loading project…" />);
  if (state === 'error') {
    return inDialog(
      <ErrorMessage title="Could not load this project" onRetry={() => setAttempt((n) => n + 1)}>
        {loadError}
      </ErrorMessage>,
    );
  }
  if (state === 'missing') {
    return inDialog(
      <ErrorMessage title="Project not found">
        It may have been deleted. <a href={adminHref('projects')}>Back to Projects</a>
      </ErrorMessage>,
    );
  }

  return (
    <Dialog label={title} onClose={onCancel}>
      <div className="dialog-body">
        <div className="dialog-media">
          {id ? (
            <>
              <ProjectImages postId={id} />
              <ProjectVideo postId={id} />
            </>
          ) : (
            <>
              <h2>Images and video</h2>
              <p className="muted">Create the project first, then you can add images and video.</p>
            </>
          )}
        </div>

        <form className="dialog-fields" onSubmit={onSubmit} noValidate>
          <h1 className="dialog-title">{title}</h1>
          {!id && (
            <p className="muted">New projects start as drafts. Nothing shows on your site yet.</p>
          )}

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

          {id && (
            <div className="visibility">
              <p className="field-label">Visibility</p>
              <p className="muted">
                {meta.status === 'published'
                  ? 'This project is live on your site.'
                  : 'This project is a draft. Visitors cannot see it until you publish it.'}
              </p>
              <PublishControls
                status={meta.status}
                featured={meta.featured}
                busy={metaBusy}
                onTogglePublished={() => {
                  const publish = meta.status !== 'published';
                  void changeMeta({ status: publish ? 'published' : 'draft' }, () =>
                    setPublished(id, publish),
                  );
                }}
                onToggleFeatured={() =>
                  void changeMeta({ featured: !meta.featured }, () =>
                    setFeatured(id, !meta.featured),
                  )
                }
              />
              {metaError && (
                <p className="error" role="alert">
                  {metaError}
                </p>
              )}
            </div>
          )}

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
              {dirty ? 'Cancel' : 'Close'}
            </button>
            {dirty && <span className="muted">Unsaved changes</span>}
            {id && (
              <button
                type="button"
                className="danger push-right"
                disabled={saving}
                onClick={() => void onDelete()}
              >
                Delete project
              </button>
            )}
          </div>
        </form>
      </div>
    </Dialog>
  );
}
