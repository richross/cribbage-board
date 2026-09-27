import { useEffect, useMemo, useRef, useState } from 'react';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import type { Card } from '../../domain/cards';
import { cardId } from '../../domain/cards';
import { scoreHand } from '../../domain/hand';
import { Button, SegmentedControl, useAnnounce } from '../../components';
import Breakdown from './components/Breakdown';
import CardPicker from './components/CardPicker';
import CardSlots from './components/CardSlots';
import { useHandState } from './useHandState';
import styles from './HandPage.module.css';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function HandPage() {
  useDocumentTitle('Score Hand');
  const announce = useAnnounce();
  const { slots, isCrib, activeIndex, isUsed, pick, removeSlot, selectSlot, setCrib, reset, setCards } =
    useHandState();

  const [selectedComboId, setSelectedComboId] = useState<string | null>(null);
  const [hoveredComboId, setHoveredComboId] = useState<string | null>(null);
  const breakdownRef = useRef<HTMLDivElement | null>(null);
  const wasCompleteRef = useRef(false);

  const slotsKey = useMemo(
    () => slots.map((card) => (card ? cardId(card) : '_')).join(',') + (isCrib ? ':crib' : ':hand'),
    [slots, isCrib],
  );

  // A combo highlight only makes sense for the hand it was computed from —
  // clear it whenever the cards or Hand/Crib toggle change.
  useEffect(() => {
    setSelectedComboId(null);
    setHoveredComboId(null);
  }, [slotsKey]);

  const score = useMemo(() => {
    if (slots.some((card) => card === null)) {
      return null;
    }
    const hand = slots.slice(0, 4) as Card[];
    const starter = slots[4] as Card;
    return scoreHand({ hand, starter, isCrib });
  }, [slots, isCrib]);

  useEffect(() => {
    if (!score) {
      return;
    }
    announce(`${isCrib ? 'Crib' : 'Hand'} scores ${score.total}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score?.total, isCrib]);

  // Scroll the breakdown into view the moment the hand first becomes
  // complete, so the answer isn't stranded far below the picker on mobile.
  useEffect(() => {
    const isComplete = score !== null;
    if (isComplete && !wasCompleteRef.current) {
      try {
        breakdownRef.current?.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      } catch {
        // scrollIntoView may be unavailable/unimplemented in some test environments.
      }
    }
    wasCompleteRef.current = isComplete;
  }, [score]);

  const activeComboId = hoveredComboId ?? selectedComboId;
  const highlightedCards = useMemo(() => {
    if (!score || !activeComboId) {
      return [];
    }
    return score.combos.find((combo) => combo.id === activeComboId)?.cards ?? [];
  }, [score, activeComboId]);

  const toggleCombo = (id: string) => {
    setSelectedComboId((prev) => (prev === id ? null : id));
  };

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <h1>Score Hand</h1>
        <Button variant="secondary" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>

      <CardSlots
        slots={slots}
        activeIndex={activeIndex}
        isCrib={isCrib}
        highlightedCards={highlightedCards}
        dimOthers={highlightedCards.length > 0}
        onSelectEmpty={selectSlot}
        onRemove={removeSlot}
      />

      {score ? (
        <a
          className={styles.compactResult}
          href="#hand-breakdown"
          onClick={(event) => {
            event.preventDefault();
            try {
              breakdownRef.current?.scrollIntoView({
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                block: 'start',
              });
            } catch {
              // scrollIntoView may be unavailable in some test environments.
            }
          }}
        >
          {`= ${score.total} points · See breakdown ↓`}
        </a>
      ) : null}

      <div className={styles.toggleRow}>
        <SegmentedControl
          label="Score as"
          value={isCrib ? 'crib' : 'hand'}
          onChange={(value) => setCrib(value === 'crib')}
          options={[
            { value: 'hand', label: 'Hand' },
            { value: 'crib', label: 'Crib' },
          ]}
        />
        <p className={styles.helper}>Crib flushes need all five cards to match.</p>
      </div>

      <div className={styles.workArea}>
        <div className={styles.picker}>
          <CardPicker isUsed={isUsed} onPick={pick} onApplyText={setCards} />
        </div>
        <div className={styles.breakdown} id="hand-breakdown" ref={breakdownRef}>
          <Breakdown
            slots={slots}
            isCrib={isCrib}
            score={score}
            highlightedComboId={selectedComboId}
            onToggleCombo={toggleCombo}
            onHoverCombo={setHoveredComboId}
          />
        </div>
      </div>
    </section>
  );
}

export default HandPage;
