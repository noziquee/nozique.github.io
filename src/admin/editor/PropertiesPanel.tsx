import { useEffect, useId, useState } from 'react';
import type { Design } from '../../shared/design';
import { findElement } from './designOps';
import { COMMON_GROUPS, NAME_FIELD, TYPE_GROUPS, applyField, getAt } from './fields';
import type { FieldSpec, FieldValue } from './fields';

interface FieldProps {
  spec: FieldSpec;
  value: unknown;
  /** Try to store a new value. Returns an error message, or null when it was accepted. */
  onCommit: (value: FieldValue) => string | null;
}

function show(value: unknown): string {
  return value === undefined || value === null ? '' : String(value);
}

function isHex6(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** One input. It keeps what you are typing while you type, and only accepted values are saved. */
function FieldInput({ spec, value, onCommit }: FieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(show(value));
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow outside changes (dragging on the canvas, for example) unless you are typing here.
  useEffect(() => {
    if (!focused) {
      setDraft(show(value));
      setError(null);
    }
  }, [value, focused]);

  function typed(text: string) {
    setDraft(text);
    if (spec.kind === 'number') {
      if (text.trim() === '' || Number.isNaN(Number(text))) {
        setError('Enter a number.');
        return;
      }
      setError(onCommit(Number(text)));
      return;
    }
    const optional = (spec.kind === 'text' || spec.kind === 'colour') && spec.optional;
    setError(onCommit(text === '' && optional ? undefined : text));
  }

  const focusProps = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) };
  let input;
  switch (spec.kind) {
    case 'number':
      return (
        <div className="prop">
          <label htmlFor={id}>{spec.label}</label>
          <input
            id={id}
            type="number"
            step={spec.step}
            value={draft}
            onChange={(event) => typed(event.target.value)}
            {...focusProps}
          />
          {error && <span className="prop-error">{error}</span>}
        </div>
      );
    case 'text':
      input = spec.multiline ? (
        <textarea
          id={id}
          rows={3}
          value={draft}
          onChange={(event) => typed(event.target.value)}
          {...focusProps}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(event) => typed(event.target.value)}
          {...focusProps}
        />
      );
      break;
    case 'colour':
      input = (
        <div className="prop-colour">
          <input
            type="color"
            aria-label={`${spec.label} picker`}
            value={isHex6(value) ? value : '#000000'}
            onChange={(event) => setError(onCommit(event.target.value))}
          />
          <input
            id={id}
            type="text"
            value={draft}
            placeholder={spec.optional ? 'none' : ''}
            onChange={(event) => typed(event.target.value)}
            {...focusProps}
          />
        </div>
      );
      break;
    case 'select':
      input = (
        <select
          id={id}
          value={show(value)}
          onChange={(event) => {
            const chosen = event.target.value;
            setError(onCommit(spec.numeric ? Number(chosen) : chosen));
          }}
        >
          {spec.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'toggle':
      return (
        <div className="prop prop-toggle">
          <label htmlFor={id}>
            <input
              id={id}
              type="checkbox"
              checked={value === true}
              onChange={(event) => setError(onCommit(event.target.checked))}
            />
            {spec.label}
          </label>
          {error && <span className="prop-error">{error}</span>}
        </div>
      );
  }
  return (
    <div className="prop">
      <label htmlFor={id}>{spec.label}</label>
      {input}
      {error && <span className="prop-error">{error}</span>}
    </div>
  );
}

interface Props {
  design: Design;
  selectedId: string | null;
  onChange: (design: Design, group?: string) => void;
}

/** The properties of the selected element, built from the field lists in fields.ts. */
export function PropertiesPanel({ design, selectedId, onChange }: Props) {
  const element = selectedId ? findElement(design, selectedId) : undefined;
  if (!element) {
    return (
      <aside className="props-panel" aria-label="Properties">
        <h2>Properties</h2>
        <p className="muted">Select an element to change its properties.</p>
      </aside>
    );
  }
  const elementId = element.id;
  const groups = [...COMMON_GROUPS, ...TYPE_GROUPS[element.type]];

  function commit(spec: FieldSpec, value: FieldValue): string | null {
    const result = applyField(design, elementId, spec, value);
    if (!result.ok) return result.error;
    // Typing in one field is one undo step, not one per keystroke.
    onChange(result.design, `${elementId}:${spec.key}`);
    return null;
  }

  return (
    <aside className="props-panel" aria-label="Properties">
      <h2>Properties</h2>
      <FieldInput
        key={`${elementId}:${NAME_FIELD.key}`}
        spec={NAME_FIELD}
        value={getAt(element, NAME_FIELD.key)}
        onCommit={(value) => commit(NAME_FIELD, value)}
      />
      {groups.map((group) => (
        <fieldset key={group.title} className="props-group">
          <legend>{group.title}</legend>
          <div className={group.grid ? 'props-grid' : undefined}>
            {group.fields.map((spec) => (
              <FieldInput
                key={`${elementId}:${spec.key}`}
                spec={spec}
                value={getAt(element, spec.key)}
                onCommit={(value) => commit(spec, value)}
              />
            ))}
          </div>
        </fieldset>
      ))}
    </aside>
  );
}
