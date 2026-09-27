import { useEffect } from 'react';

const SUFFIX = 'Cribbage Companion';

/** Sets `document.title` to `"<title> · Cribbage Companion"` for the lifetime of the calling component. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · ${SUFFIX}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
