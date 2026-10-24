import { describe, expect, it } from 'vitest';
import {
  MAX_HISTORY,
  canRedo,
  canUndo,
  createHistory,
  endGroup,
  record,
  redo,
  undo,
} from './history';

describe('history', () => {
  it('starts with nothing to undo or redo', () => {
    const history = createHistory(1);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
  });

  it('undoes and redoes in order', () => {
    let history = createHistory('a');
    history = record(history, 'b');
    history = record(history, 'c');
    expect(history.present).toBe('c');
    history = undo(history);
    expect(history.present).toBe('b');
    history = undo(history);
    expect(history.present).toBe('a');
    expect(canUndo(history)).toBe(false);
    history = redo(history);
    history = redo(history);
    expect(history.present).toBe('c');
    expect(canRedo(history)).toBe(false);
  });

  it('forgets Redo after a new change', () => {
    let history = record(record(createHistory(1), 2), 3);
    history = undo(history);
    history = record(history, 9);
    expect(canRedo(history)).toBe(false);
    expect(history.present).toBe(9);
    expect(undo(history).present).toBe(2);
  });

  it('ignores a change that is the same value', () => {
    const history = createHistory({ a: 1 });
    expect(record(history, history.present)).toBe(history);
  });

  it('merges changes of the same group into one step', () => {
    let history = createHistory(0);
    for (const value of [1, 2, 3, 4]) history = record(history, value, 'drag-1');
    expect(history.present).toBe(4);
    expect(history.past).toEqual([0]);
    expect(undo(history).present).toBe(0);
  });

  it('starts a new step for a different group or after endGroup', () => {
    let history = record(record(createHistory(0), 1, 'a'), 2, 'b');
    expect(history.past).toEqual([0, 1]);
    history = record(history, 3, 'b');
    expect(history.past).toEqual([0, 1]);
    history = record(endGroup(history), 4, 'b');
    expect(history.past).toEqual([0, 1, 3]);
  });

  it('keeps at most MAX_HISTORY steps', () => {
    let history = createHistory(0);
    for (let i = 1; i <= MAX_HISTORY + 20; i += 1) history = record(history, i);
    expect(history.past).toHaveLength(MAX_HISTORY);
    expect(history.present).toBe(MAX_HISTORY + 20);
  });
});
