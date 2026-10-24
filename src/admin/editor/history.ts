/**
 * Undo and redo for any kind of value. `present` is what is on screen, `past` what Undo goes
 * back to, `future` what Redo goes forward to.
 */
export interface History<T> {
  past: readonly T[];
  present: T;
  future: readonly T[];
  /** The group of the last change. A new change with the same group replaces it. */
  group: string | null;
}

export const MAX_HISTORY = 100;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], group: null };
}

/**
 * Record a new value. Changes that share a `group` (every step of one drag, every keystroke in
 * one field) become a single undo step. A normal change also clears Redo.
 */
export function record<T>(history: History<T>, next: T, group?: string): History<T> {
  if (Object.is(next, history.present)) return history;
  if (group !== undefined && group === history.group) {
    return { ...history, present: next, future: [] };
  }
  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY),
    present: next,
    future: [],
    group: group ?? null,
  };
}

/** Stop merging: the next change starts a new undo step. */
export function endGroup<T>(history: History<T>): History<T> {
  return history.group === null ? history : { ...history, group: null };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) return history;
  const past = history.past.slice(0, -1);
  return {
    past,
    present: history.past[history.past.length - 1] as T,
    future: [history.present, ...history.future],
    group: null,
  };
}

export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) return history;
  return {
    past: [...history.past, history.present],
    present: history.future[0] as T,
    future: history.future.slice(1),
    group: null,
  };
}
