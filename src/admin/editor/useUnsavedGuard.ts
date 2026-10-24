import { useEffect } from 'react';

const MESSAGE = 'You have unsaved changes. Leave this page and lose them?';

/**
 * While `dirty`, warn before leaving: closing or reloading the tab, and clicking any link that
 * goes to another admin page. (The browser's Back button cannot be intercepted this way.)
 */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    function onClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest('a');
      const href = link?.getAttribute('href');
      if (!href || !href.startsWith('#') || href === window.location.hash) return;
      if (!window.confirm(MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty]);
}
