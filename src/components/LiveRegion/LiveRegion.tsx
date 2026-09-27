import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import VisuallyHidden from '../VisuallyHidden/VisuallyHidden';

type Politeness = 'polite' | 'assertive';

interface AnnounceContextValue {
  announce: (message: string, politeness?: Politeness) => void;
}

const AnnounceContext = createContext<AnnounceContextValue | null>(null);

/**
 * Provides a polite (default) or assertive `aria-live` announcer for the
 * whole app — used for scoring and undo feedback that must reach screen
 * reader users without moving focus.
 */
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');
  // Repeating the same message needs a nudge (toggle trailing space) so
  // assistive tech re-announces it.
  const toggleRef = useRef(false);

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    toggleRef.current = !toggleRef.current;
    const suffix = toggleRef.current ? '' : '\u200b';
    const value = `${message}${suffix}`;
    if (politeness === 'assertive') {
      setAssertiveMessage(value);
    } else {
      setPoliteMessage(value);
    }
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <VisuallyHidden as="div">
        <div aria-live="polite" aria-atomic="true">
          {politeMessage}
        </div>
        <div aria-live="assertive" aria-atomic="true">
          {assertiveMessage}
        </div>
      </VisuallyHidden>
    </AnnounceContext.Provider>
  );
}

/** Returns an `announce(message, politeness?)` function backed by the app's shared live region. */
export function useAnnounce() {
  const ctx = useContext(AnnounceContext);
  if (!ctx) {
    throw new Error('useAnnounce must be used within a LiveRegionProvider');
  }
  return ctx.announce;
}
