import { useEffect, useState } from 'react';
import { Canvas } from '../editor/Canvas';
import { loadSectionForEditing } from '../data/siteSections';
import type { SectionForEditing } from '../data/siteSections';
import { isDesignable } from '../data/sectionRules';
import { adminHref } from '../routing';
import { ErrorMessage, Loading } from '../ui/states';

const SOURCE_NOTE = {
  draft: 'Opened from your unpublished draft.',
  published: 'Opened from the published design.',
  none: 'No design yet, so this is a blank canvas. The built-in section stays live.',
} as const;

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

  useEffect(() => {
    let cancelled = false;
    setSection(null);
    setError(null);
    setSelectedId(null);
    loadSectionForEditing(sectionKey).then(
      (loaded) => {
        if (!cancelled) setSection(loaded);
      },
      (problem: unknown) => {
        if (!cancelled) setError(problem instanceof Error ? problem.message : 'Could not load.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

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

  const { design, source } = section.picked;
  const selected = selectedId
    ? design.layouts.desktop.elements.find((element) => element.id === selectedId)
    : undefined;
  const status = selected
    ? `Selected: ${selected.name ?? selected.id} (${selected.type}) at ` +
      `${Math.round(selected.position.x)}, ${Math.round(selected.position.y)}, size ` +
      `${Math.round(selected.size.width)} × ${Math.round(selected.size.height)}`
    : 'Nothing selected. Click an element to select it.';

  return (
    <section className="editor-page">
      <Back />
      <h1>{section.name}</h1>
      <p className="muted">
        {SOURCE_NOTE[source]} Changes cannot be saved yet: this step is only about looking around.
      </p>
      <Canvas design={design} selectedId={selectedId} onSelect={setSelectedId} />
      <p className="canvas-status" aria-live="polite">
        {status}
      </p>
    </section>
  );
}
