import { useCallback, useEffect, useState } from 'react';
import { Canvas } from '../editor/Canvas';
import { PropertiesPanel } from '../editor/PropertiesPanel';
import { LayersPanel } from '../editor/LayersPanel';
import {
  addElement,
  canStep,
  deleteElement,
  findElement,
  stepElement,
} from '../editor/designOps';
import { canRedo, canUndo, createHistory, endGroup, record, redo, undo } from '../editor/history';
import type { History } from '../editor/history';
import type { NewElementKind, StackStep } from '../editor/designOps';
import { useUnsavedGuard } from '../editor/useUnsavedGuard';
import type { Design } from '../../shared/design';
import { buildDraftContent } from '../data/sectionDesign';
import {
  discardSectionDraft,
  loadSectionForEditing,
  publishSection,
  removePublishedDesign,
  saveSectionDraft,
} from '../data/siteSections';
import type { SectionForEditing } from '../data/siteSections';
import { isDesignable } from '../data/sectionRules';
import { adminHref } from '../routing';
import { ErrorMessage, Loading } from '../ui/states';

const SOURCE_NOTE = {
  draft: 'Opened from your unpublished draft.',
  published: 'Opened from the published design.',
  none: 'No design yet, so this is a blank canvas. The built-in section stays live.',
} as const;

function messageOf(problem: unknown): string {
  return problem instanceof Error ? problem.message : 'Something went wrong.';
}

function Back() {
  return (
    <a className="back-link" href={adminHref('website')}>
      ← Website
    </a>
  );
}

export function SectionEditorPage({ sectionKey }: { sectionKey: string }) {
  const [section, setSection] = useState<SectionForEditing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<History<Design> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<Design | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSection(null);
    setError(null);
    setSelectedId(null);
    setHistory(null);
    setBaseline(null);
    setNotice(null);
    setSuccess(null);
    loadSectionForEditing(sectionKey).then(
      (loaded) => {
        if (cancelled) return;
        setSection(loaded);
        const opened = loaded.picked.ok ? loaded.picked.design : null;
        setHistory(opened ? createHistory(opened) : null);
        setBaseline(opened);
      },
      (problem: unknown) => {
        if (!cancelled) setError(problem instanceof Error ? problem.message : 'Could not load.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  const design = history ? history.present : null;
  const dirty = Boolean(design && baseline && design !== baseline);
  useUnsavedGuard(dirty);

  /** Store a change. Changes sharing a `group` (one drag, one field) undo as one step. */
  const change = useCallback((next: Design, group?: string) => {
    setHistory((current) => (current ? record(current, next, group) : current));
  }, []);

  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setHistory((current) => (current ? endGroup(current) : current));
  }, []);

  // Ctrl+Z undoes, Ctrl+Shift+Z or Ctrl+Y redoes (text boxes keep their own undo).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      event.preventDefault();
      const forward = key === 'y' || event.shiftKey;
      setHistory((current) => (current ? (forward ? redo(current) : undo(current)) : current));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // After Undo or Redo the selected element may not exist any more.
  useEffect(() => {
    if (design && selectedId && !findElement(design, selectedId)) setSelectedId(null);
  }, [design, selectedId]);

  if (!isDesignable(sectionKey)) {
    return (
      <section>
        <Back />
        <ErrorMessage title="Not editable yet">
          This section is built in. Visual editing is only available for the hero so far.
        </ErrorMessage>
      </section>
    );
  }
  if (error) {
    return (
      <section>
        <Back />
        <ErrorMessage>{error}</ErrorMessage>
      </section>
    );
  }
  if (!section) {
    return (
      <section>
        <Back />
        <Loading />
      </section>
    );
  }
  if (!section.picked.ok) {
    return (
      <section>
        <Back />
        <h1>{section.name}</h1>
        <ErrorMessage title="This design cannot be opened">
          It does not match the design format:
        </ErrorMessage>
        <ul className="error">
          {section.picked.errors.slice(0, 10).map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </section>
    );
  }

  const { source } = section.picked;
  if (!history || !design) return <Loading />;
  const selected = selectedId
    ? design.layouts.desktop.elements.find((element) => element.id === selectedId)
    : undefined;
  function add(kind: NewElementKind) {
    if (!design) return;
    const result = addElement(design, kind);
    if (!result.ok) {
      setNotice(result.error);
      return;
    }
    setNotice(null);
    change(result.design);
    select(result.id);
  }

  function step(direction: StackStep) {
    if (design && selectedId) change(stepElement(design, selectedId, direction));
  }

  const can = (direction: StackStep) =>
    Boolean(design && selectedId && canStep(design, selectedId, direction));

  /** Run a save-type action: block the buttons meanwhile and report what happened. */
  async function run(task: () => Promise<string | null>) {
    setBusy(true);
    setNotice(null);
    setSuccess(null);
    try {
      setSuccess(await task());
    } catch (problem) {
      setNotice(messageOf(problem));
    }
    setBusy(false);
  }

  /** Store the current design as the draft (the live site is not touched). */
  async function persistDraft() {
    if (!design || !section) return;
    const built = buildDraftContent(section.content, design);
    if (!built.ok) {
      throw new Error(`The design is not valid: ${built.errors.slice(0, 3).join('; ')}`);
    }
    await saveSectionDraft(sectionKey, built.content, section.publishedAt);
    setBaseline(design);
  }

  const saveDraft = () =>
    run(async () => {
      await persistDraft();
      setSection(await loadSectionForEditing(sectionKey));
      return 'Draft saved. The public site is unchanged until you publish.';
    });

  const publish = () =>
    run(async () => {
      if (!design || design.layouts.desktop.elements.length === 0) {
        const ok = window.confirm(
          'This design has no elements, so the home page would show an empty hero. Publish anyway?',
        );
        if (!ok) return null;
      }
      await persistDraft();
      await publishSection(sectionKey);
      setSection(await loadSectionForEditing(sectionKey));
      return 'Published. The home page now uses this design.';
    });

  const discard = () =>
    run(async () => {
      const sure = window.confirm('Throw away your unpublished changes and go back to the live one?');
      if (!sure) return null;
      await discardSectionDraft(sectionKey);
      const fresh = await loadSectionForEditing(sectionKey);
      if (fresh.picked.ok) {
        setHistory(createHistory(fresh.picked.design));
        setBaseline(fresh.picked.design);
      }
      setSelectedId(null);
      setSection(fresh);
      return 'Back to the live version.';
    });

  const switchToBuiltIn = () =>
    run(async () => {
      const sure = window.confirm('Switch the home page back to the built-in version?');
      if (!sure) return null;
      await removePublishedDesign(sectionKey, section?.content);
      setSection(await loadSectionForEditing(sectionKey));
      return 'The home page uses the built-in version again. Your design is still here to edit.';
    });

  const state = dirty
    ? 'Unsaved changes'
    : section?.hasDraft
      ? 'Draft saved, not live'
      : section?.hasPublishedDesign
        ? 'Live'
        : 'Built-in version is live';
  const hasUnpublished = dirty || Boolean(section?.hasDraft);

  function remove() {
    if (!design || !selectedId) return;
    change(deleteElement(design, selectedId));
    select(null);
  }

  const count = design.layouts.desktop.elements.length;
  const status = selected
    ? `Selected: ${selected.name ?? selected.id} (${selected.type}) at ` +
      `${selected.position.x}, ${selected.position.y}, size ` +
      `${selected.size.width} × ${selected.size.height}, rotation ${selected.rotation}°`
    : 'Nothing selected. Click an element to select it, then drag it or its handles.';

  return (
    <section className="editor-page">
      <Back />
      <h1>{section.name}</h1>
      <p className="muted">
        {SOURCE_NOTE[source]}
      </p>
      <div className="editor-bar">
        <span className={`badge${dirty ? ' badge-draft' : ''}`}>{state}</span>
        <button type="button" disabled={busy || !dirty} onClick={() => void saveDraft()}>
          Save draft
        </button>
        <button
          type="button"
          className="primary"
          disabled={busy || !hasUnpublished}
          onClick={() => void publish()}
        >
          Publish
        </button>
        <button type="button" disabled={busy || !hasUnpublished} onClick={() => void discard()}>
          Discard changes
        </button>
        {section?.hasPublishedDesign && (
          <button type="button" disabled={busy} onClick={() => void switchToBuiltIn()}>
            Use built-in version
          </button>
        )}
      </div>
      {notice && (
        <p className="error" role="alert">
          {notice}
        </p>
      )}
      {success && (
        <p className="success" role="status">
          {success}
        </p>
      )}
      <div className="editor-layout">
        <aside className="editor-panel" aria-label="Elements">
          <h2>History</h2>
          <button
            type="button"
            disabled={!canUndo(history)}
            title="Ctrl + Z"
            onClick={() => setHistory(undo(history))}
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!canRedo(history)}
            title="Ctrl + Shift + Z"
            onClick={() => setHistory(redo(history))}
          >
            Redo
          </button>
          <h2>Add</h2>
          <button type="button" onClick={() => add('text')}>
            Text
          </button>
          <button type="button" onClick={() => add('rectangle')}>
            Rectangle
          </button>
          <button type="button" onClick={() => add('ellipse')}>
            Ellipse
          </button>
          <h2>Selected</h2>
          <button type="button" disabled={!can('front')} onClick={() => step('front')}>
            To front
          </button>
          <button type="button" disabled={!can('forward')} onClick={() => step('forward')}>
            Forward
          </button>
          <button type="button" disabled={!can('backward')} onClick={() => step('backward')}>
            Backward
          </button>
          <button type="button" disabled={!can('back')} onClick={() => step('back')}>
            To back
          </button>
          <button type="button" className="danger" disabled={!selectedId} onClick={remove}>
            Delete
          </button>
          <p className="muted">
            {count} {count === 1 ? 'element' : 'elements'}
          </p>
        </aside>
        <Canvas
          design={design}
          selectedId={selectedId}
          onSelect={select}
          onChange={change}
          onDelete={remove}
        />
        <div className="editor-side">
          <LayersPanel
            design={design}
            selectedId={selectedId}
            onSelect={select}
            onChange={change}
          />
          <PropertiesPanel design={design} selectedId={selectedId} onChange={change} />
        </div>
      </div>
      <p className="canvas-status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
