// The Board's zero-setup start screen: three big buttons, one tap starts
// immediately. No names, no dealer setup.
import type { GameFormat, TrackId } from '../../domain/board';
import { getTracks } from '../../domain/board';
import PegShape from '../../components/PegShape/PegShape';
import { trackColorVar } from './colors';
import styles from './StartScreen.module.css';

export interface StartScreenProps {
  onStart: (format: GameFormat) => void;
  corruptNotice?: boolean;
}

const FORMATS: { format: GameFormat; label: string; caption: string }[] = [
  { format: 'two', label: '2 Players', caption: 'Two players' },
  { format: 'three', label: '3 Players', caption: 'Three players' },
  { format: 'teams', label: '2 v 2', caption: 'Two teams of two' },
];

function FormatIcon({ format }: { format: GameFormat }) {
  const tracks = getTracks(format);
  return (
    <span className={styles.icon} aria-hidden="true">
      {tracks.map((track: { id: TrackId; shape: 'circle' | 'square' | 'triangle'; color: 'red' | 'blue' | 'ochre' }) => (
        <PegShape key={track.id} shape={track.shape} color={trackColorVar(track.color)} solid size={20} />
      ))}
    </span>
  );
}

function StartScreen({ onStart, corruptNotice }: StartScreenProps) {
  return (
    <div className={styles.wrapper}>
      <h1 className={styles.heading}>Board</h1>
      {corruptNotice ? (
        <p className={styles.notice}>Couldn't restore the last game.</p>
      ) : null}
      <p className={styles.subheading}>Pick a format to start pegging.</p>
      <div className={styles.buttons}>
        {FORMATS.map(({ format, label, caption }) => (
          <button key={format} type="button" className={styles.formatButton} onClick={() => onStart(format)}>
            <FormatIcon format={format} />
            <span className={styles.formatText}>
              <span
                className={[
                  'label',
                  styles.formatLabel,
                  format === 'teams' ? styles.formatLabelLowerV : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {label}
              </span>
              <span className={styles.formatCaption}>{caption}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default StartScreen;
