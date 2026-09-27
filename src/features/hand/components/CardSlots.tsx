import type { Card } from '../../../domain/cards';
import { formatCard, sameCard } from '../../../domain/cards';
import { STARTER_INDEX } from '../state';
import type { Slots } from '../state';
import CardFace from './CardFace';
import styles from './CardSlots.module.css';

export interface CardSlotsProps {
  slots: Slots;
  activeIndex: number;
  isCrib: boolean;
  highlightedCards: Card[];
  dimOthers: boolean;
  onSelectEmpty: (index: number) => void;
  onRemove: (index: number) => void;
}

function slotLabel(index: number, isCrib: boolean): string {
  return index === STARTER_INDEX ? 'Starter' : `${isCrib ? 'Crib' : 'Hand'} ${index + 1}`;
}

/**
 * The slots row: 4 hand/crib slots, a visible gap, then the starter slot.
 * Tapping a filled slot removes its card and makes the slot active; tapping
 * an empty slot makes it active so the next pick lands there.
 */
function CardSlots({
  slots,
  activeIndex,
  isCrib,
  highlightedCards,
  dimOthers,
  onSelectEmpty,
  onRemove,
}: CardSlotsProps) {
  const renderSlot = (index: number) => {
    const card = slots[index];
    const label = slotLabel(index, isCrib);
    const filled = card !== null;
    const isActive = index === activeIndex;
    const isHighlighted = filled && highlightedCards.some((c) => sameCard(c, card));
    const isDimmed = filled && dimOthers && !isHighlighted;

    const boxClass = [
      styles.box,
      filled ? '' : styles.emptyBox,
      isHighlighted ? styles.highlighted : '',
      isDimmed ? styles.dimmed : '',
    ]
      .filter(Boolean)
      .join(' ');

    const accessibleName = filled
      ? `${label}: ${formatCard(card)}. Tap to remove.`
      : `${label}: empty. Tap to choose a card.`;

    return (
      <button
        key={index}
        type="button"
        className={styles.slot}
        aria-current={isActive ? 'true' : undefined}
        aria-label={accessibleName}
        onClick={() => (filled ? onRemove(index) : onSelectEmpty(index))}
      >
        <span className={[styles.caption, 'label'].join(' ')} aria-hidden="true">
          {label}
        </span>
        <span className={boxClass} data-active={isActive ? 'true' : undefined}>
          {filled ? (
            <CardFace card={card} />
          ) : (
            <span className={styles.placeholderNumber} aria-hidden="true">
              {index === STARTER_INDEX ? 'Starter' : index + 1}
            </span>
          )}
          {isHighlighted ? (
            <span className={styles.marker} aria-hidden="true">
              ✓
            </span>
          ) : null}
        </span>
      </button>
    );
  };

  return (
    <div className={styles.row}>
      {[0, 1, 2, 3].map(renderSlot)}
      <div className={styles.gap} aria-hidden="true" />
      {renderSlot(STARTER_INDEX)}
    </div>
  );
}

export default CardSlots;
