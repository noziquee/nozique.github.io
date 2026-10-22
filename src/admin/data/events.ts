/** Sent when a project changes, so the list behind the editor dialog can refresh itself. */
export const PROJECTS_CHANGED = 'nozique:projects-changed';

export function notifyProjectsChanged(): void {
  window.dispatchEvent(new Event(PROJECTS_CHANGED));
}
