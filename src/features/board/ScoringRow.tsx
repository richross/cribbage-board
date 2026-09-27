// A single track's scoring row: label + peg shape, the big total and "N to
// go" on one line, the +1..+6 quick keys, and a "+#" key that opens the
// inline number pad. Every tap logs immediately.
import { useEffect, useState } from 'react';
import type { TrackState } from '../../domain/board';
import Key from '../../components/Key/Key';
import PegShape from '../../components/PegShape/PegShape';
import { trackColorVar } from './colors';
import NumberPad from './NumberPad';
import styles from './ScoringRow.module.css';

export interface ScoringRowProps {
  trackState: TrackState;
  disabled: boolean;
  onScore: (amount: number) => void;
}

const QUICK_AMOUNTS = [1, 2, 3, 4, 5, 6];
// A single 48px key floor + inline min-width override lets 7 keys share one
// row at 360px content width (~328px) without violating the shared Key
// component's 44px accessible touch-target minimum.
const KEY_STYLE = { flex: '1 1 0', minWidth: 44, minHeight: 44, padding: '0 2px' } as const;

function ScoringRow({ trackState, disabled, onScore }: ScoringRowProps) {
  const [padOpen, setPadOpen] = useState(false);
  const [flash, setFlash] = useState<{ amount: number; key: number } | null>(null);
  const color = trackColorVar(trackState.track.color);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = window.setTimeout(() => setFlash(null), 1400);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const score = (amount: number) => {
    onScore(amount);
    setFlash({ amount, key: Date.now() });
    setPadOpen(false);
  };

  return (
    <div className={styles.row}>
      <div className={styles.headRow}>
        <div className={styles.heading}>
          <PegShape shape={trackState.track.shape} color={color} solid title={trackState.track.label} />
          <span className={[styles.label, 'label'].join(' ')}>{trackState.track.label}</span>
        </div>

        <div className={styles.totalGroup}>
          <span className={styles.toGo}>{trackState.toGo} to go</span>
          {/* Reserved, in-flow slot: appearing/disappearing pushes layout
              rather than floating over anything, so it can never overlap
              the sticky undo bar or other content. */}
          <span className={styles.flashSlot} aria-hidden="true">
            {flash ? (
              <span key={flash.key} className={styles.flash} style={{ color }}>
                +{flash.amount}
              </span>
            ) : null}
          </span>
          <span className={styles.total} data-testid={`total-${trackState.track.id}`}>
            {trackState.score}
          </span>
        </div>
      </div>

      <div className={styles.keys}>
        {QUICK_AMOUNTS.map((amount) => (
          <Key
            key={amount}
            trackColor={color}
            disabled={disabled}
            onClick={() => score(amount)}
            aria-label={`Add ${amount} to ${trackState.track.label}`}
            style={KEY_STYLE}
          >
            +{amount}
          </Key>
        ))}
        <Key
          trackColor={color}
          disabled={disabled}
          aria-expanded={padOpen}
          onClick={() => setPadOpen((open) => !open)}
          aria-label={`Enter a score for ${trackState.track.label}`}
          style={KEY_STYLE}
        >
          +#
        </Key>
      </div>

      {padOpen && !disabled ? (
        <NumberPad
          trackLabel={trackState.track.label}
          onConfirm={score}
          onCancel={() => setPadOpen(false)}
        />
      ) : null}
    </div>
  );
}

export default ScoringRow;
