// Keeps the screen awake while a game is on the Board. Requests the Screen
// Wake Lock on the first user gesture (the API requires a user activation),
// re-acquires it when the tab becomes visible again, and releases it on
// unmount or when the game is no longer active. Unsupported or rejected
// requests are ignored silently — this is a nice-to-have, not a requirement.
import { useEffect, useRef } from 'react';

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      requestedRef.current = false;
      return undefined;
    }

    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike }).wakeLock;
    let cancelled = false;

    const requestLock = () => {
      if (!wakeLock) return;
      wakeLock
        .request('screen')
        .then((sentinel) => {
          // The effect may have cleaned up while the request was pending.
          if (cancelled) {
            sentinel.release().catch(() => undefined);
            return;
          }
          sentinelRef.current?.release().catch(() => undefined);
          sentinelRef.current = sentinel;
        })
        .catch(() => {
          // Unsupported, denied, or rejected (e.g. low battery) — degrade silently.
        });
    };

    const onFirstInteraction = () => {
      if (requestedRef.current) return;
      requestedRef.current = true;
      requestLock();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && requestedRef.current) {
        requestLock();
      }
    };

    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      sentinel?.release().catch(() => {
        // Already released or unsupported — nothing to do.
      });
    };
  }, [active]);
}
