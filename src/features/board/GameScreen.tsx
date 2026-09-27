// The active game screen: title block (format · hand · dealer & crib), a
// compact next-deal/new-game action row, the peg board, one scoring row per
// track, history, undo, win state, and the "start a new game" confirm flow.
import { useEffect, useRef, useState } from 'react';
import type { GameState, TrackId } from '../../domain/board';
import Button from '../../components/Button/Button';
import ConfirmInline from '../../components/ConfirmInline/ConfirmInline';
import PegShape from '../../components/PegShape/PegShape';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import TitleBlock from '../../components/TitleBlock/TitleBlock';
import VisuallyHidden from '../../components/VisuallyHidden/VisuallyHidden';
import { trackColorVar } from './colors';
import HistoryPanel from './HistoryPanel';
import PegBoard from './PegBoard';
import ResultPanel from './ResultPanel';
import ScoringRow from './ScoringRow';
import { useWakeLock } from './useWakeLock';
import type { UndoSmudge } from './useGame';
import styles from './GameScreen.module.css';

const FORMAT_ABBR: Record<GameState['format'], string> = {
  two: '2P',
  three: '3P',
  teams: '2v2',
};

export interface GameScreenProps {
  state: GameState;
  canUndo: boolean;
  undoLabel: string;
  onScore: (trackId: TrackId, amount: number) => void;
  onNextDeal: () => void;
  onSetDealer: (seatIndex: number) => void;
  onUndo: () => UndoSmudge | null;
  onNewGame: () => void;
}

function GameScreen({ state, canUndo, undoLabel, onScore, onNextDeal, onSetDealer, onUndo, onNewGame }: GameScreenProps) {
  const [dealerPickerOpen, setDealerPickerOpen] = useState(false);
  const [confirmNewGame, setConfirmNewGame] = useState(false);
  const [smudge, setSmudge] = useState<UndoSmudge | null>(null);
  const isOver = state.winner !== null;
  const resultRef = useRef<HTMLDivElement>(null);

  useWakeLock(!isOver);

  useEffect(() => {
    if (isOver && typeof resultRef.current?.scrollIntoView === 'function') {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isOver]);

  const dealerTrack = state.tracks.find((t) => t.track.id === state.dealerTrackId)?.track;
  const dealerSeat = state.seats[state.dealerSeatIndex];
  // The crib owner is always the dealer's track, so "Dealer" and "Crib" are
  // combined into a single title-block cell — this is what keeps the title
  // block to one line on narrow phones.
  const dealerCellLabel = state.format === 'teams' ? dealerSeat?.label ?? dealerTrack?.label : dealerTrack?.shortLabel;

  const handleUndo = () => {
    const result = onUndo();
    if (result) {
      setSmudge(result);
      window.setTimeout(() => setSmudge(null), 220);
    }
  };

  return (
    <div className={styles.wrapper}>
      <VisuallyHidden as="h1">Board</VisuallyHidden>

      <div className={styles.titleRow}>
        <TitleBlock
          cells={[
            { key: 'format', content: `${FORMAT_ABBR[state.format]} · Hand ${state.handNumber}` },
            {
              key: 'dealer',
              content: (
                <button
                  type="button"
                  className={styles.dealerCell}
                  onClick={() => setDealerPickerOpen((open) => !open)}
                  aria-expanded={dealerPickerOpen}
                  disabled={isOver}
                >
                  {dealerTrack ? (
                    <PegShape shape={dealerTrack.shape} color={trackColorVar(dealerTrack.color)} solid size={12} />
                  ) : null}
                  Dealer &amp; crib {dealerCellLabel}
                </button>
              ),
            },
          ]}
        />
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" size="sm" onClick={onNextDeal} disabled={isOver}>
          Next deal
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmNewGame(true)}>
          New game
        </Button>
      </div>

      {dealerPickerOpen ? (
        <div className={styles.dealerPicker}>
          <SegmentedControl
            label="Choose dealer"
            options={state.seats.map((seat) => ({ value: String(seat.seatIndex), label: seat.label }))}
            value={String(state.dealerSeatIndex)}
            onChange={(value) => {
              onSetDealer(Number(value));
              setDealerPickerOpen(false);
            }}
          />
        </div>
      ) : null}

      {confirmNewGame ? (
        <ConfirmInline
          prompt="Start a new game? This clears the board."
          confirmLabel="New game"
          onConfirm={onNewGame}
          onCancel={() => setConfirmNewGame(false)}
        />
      ) : null}

      <div className={styles.body}>
        <div className={styles.boardColumn}>
          <PegBoard tracks={state.tracks} smudge={smudge} />

          <div className={styles.rows}>
            {state.tracks.map((trackState) => (
              <ScoringRow
                key={trackState.track.id}
                trackState={trackState}
                disabled={isOver}
                onScore={(amount) => onScore(trackState.track.id, amount)}
              />
            ))}
          </div>

          {state.result ? (
            <div ref={resultRef}>
              <ResultPanel state={state} result={state.result} onUndo={handleUndo} onNewGame={onNewGame} />
            </div>
          ) : (
            <div className={styles.undoBar}>
              <Button type="button" variant="secondary" onClick={handleUndo} disabled={!canUndo}>
                {undoLabel}
              </Button>
            </div>
          )}
        </div>

        <div className={styles.historyColumn}>
          <HistoryPanel tracks={state.tracks} />
        </div>
      </div>
    </div>
  );
}

export default GameScreen;
