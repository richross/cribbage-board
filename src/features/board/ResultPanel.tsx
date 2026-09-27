// Inline (not modal) result panel shown when a track reaches 121.
import type { GameResult, GameState } from '../../domain/board';
import Button from '../../components/Button/Button';
import styles from './ResultPanel.module.css';

export interface ResultPanelProps {
  state: GameState;
  result: GameResult;
  onUndo: () => void;
  onNewGame: () => void;
}

function trackLabel(state: GameState, trackId: string): string {
  return state.tracks.find((t) => t.track.id === trackId)?.track.label ?? trackId;
}

function skunkBadge(skunk: 'none' | 'skunk' | 'double'): string | null {
  if (skunk === 'double') return 'Double skunk';
  if (skunk === 'skunk') return 'Skunk';
  return null;
}

function ResultPanel({ state, result, onUndo, onNewGame }: ResultPanelProps) {
  const winnerLabel = trackLabel(state, result.winner);
  const winnerScore = state.tracks.find((t) => t.track.id === result.winner)?.score ?? 121;
  const singleLoser = result.losers.length === 1 ? result.losers[0] : null;

  return (
    <div className={styles.panel} role="status">
      <p className={styles.heading}>
        {singleLoser ? `${winnerLabel} wins ${winnerScore}\u2013${singleLoser.score}` : `${winnerLabel} wins!`}
      </p>
      <ul className={styles.losers}>
        {result.losers.map((loser) => {
          const badge = skunkBadge(loser.skunk);
          return (
            <li key={loser.trackId} className={styles.loserRow}>
              <span>
                {trackLabel(state, loser.trackId)} · {loser.score}
              </span>
              {badge ? <span className={styles.badge}>{badge}</span> : null}
            </li>
          );
        })}
      </ul>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onUndo}>
          Undo last score
        </Button>
        <Button type="button" variant="primary" onClick={onNewGame}>
          New game
        </Button>
      </div>
    </div>
  );
}

export default ResultPanel;
