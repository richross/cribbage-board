import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from '../components/Button/Button';
import styles from './UpdatePrompt.module.css';

/**
 * Inline bottom banner for the "prompt" PWA update flow: tells the player a
 * new version is ready and offers a one-tap reload. Also shows a one-time
 * "ready to use offline" toast once the service worker finishes its first
 * install, since the player may be mid-game with no other feedback that
 * offline mode is ready.
 */
function UpdatePrompt() {
  const [offlineToastDismissed, setOfflineToastDismissed] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for updates periodically so long-lived offline sessions still
      // pick up a fresh scoreboard build once connectivity returns.
      if (!registration) return;
      const HOUR = 60 * 60 * 1000;
      setInterval(() => {
        registration.update().catch(() => undefined);
      }, HOUR);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const timer = window.setTimeout(() => {
      setOfflineReady(false);
      setOfflineToastDismissed(true);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className={styles.banner} role="status">
        <p className={styles.message}>A new version is ready.</p>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={() => setNeedRefresh(false)}>
            Dismiss
          </Button>
          <Button variant="primary" size="sm" onClick={() => updateServiceWorker(true)}>
            Reload
          </Button>
        </div>
      </div>
    );
  }

  if (offlineReady && !offlineToastDismissed) {
    return (
      <div className={styles.toast} role="status">
        Ready to use offline.
      </div>
    );
  }

  return null;
}

export default UpdatePrompt;
