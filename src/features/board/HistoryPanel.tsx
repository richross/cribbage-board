// Per-track scoring history, newest first. A collapsible <details> on
// mobile ("History"); permanently open at >=900px, where it becomes the
// right-hand column next to the peg board.
import { useEffect, useState } from 'react';
import type { TrackState } from '../../domain/board';
import styles from './HistoryPanel.module.css';

export interface HistoryPanelProps {
  tracks: TrackState[];
}

function useIsDesktop(): boolean {
  const supportsMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const [isDesktop, setIsDesktop] = useState(() => supportsMatchMedia && window.matchMedia('(min-width: 900px)').matches);
  useEffect(() => {
    if (!supportsMatchMedia) return undefined;
    const mql = window.matchMedia('(min-width: 900px)');
    const handler = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [supportsMatchMedia]);
  return isDesktop;
}

function HistoryPanel({ tracks }: HistoryPanelProps) {
  const isDesktop = useIsDesktop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasAnyHistory = tracks.some((t) => t.history.length > 0);

  return (
    <details
      className={styles.panel}
      open={isDesktop || mobileOpen}
      onToggle={(event) => setMobileOpen(event.currentTarget.open)}
    >
      <summary className={styles.summary}>
        <span className={['label', styles.summaryLabel].join(' ')}>History</span>
      </summary>
      <div className={styles.content}>
        {hasAnyHistory ? (
          tracks.map((trackState) => (
            <section key={trackState.track.id} className={styles.trackSection} aria-label={trackState.track.label}>
              <h3 className={['label', styles.trackHeading].join(' ')}>{trackState.track.label}</h3>
              {trackState.history.length === 0 ? (
                <p className={styles.empty}>No scores yet.</p>
              ) : (
                <ol className={styles.list}>
                  {[...trackState.history]
                    .reverse()
                    .map((entry) => (
                      <li key={entry.eventId} className={styles.entry}>
                        Hand {entry.hand} · +{entry.amount} → {entry.after}
                      </li>
                    ))}
                </ol>
              )}
            </section>
          ))
        ) : (
          <p className={styles.empty}>Scores appear here as you peg and count.</p>
        )}
      </div>
    </details>
  );
}

export default HistoryPanel;
