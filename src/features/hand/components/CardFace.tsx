import type { Card } from '../../../domain/cards';
import { isRed, rankLabel, suitSymbol } from '../../../domain/cards';
import styles from './CardFace.module.css';

export interface CardFaceProps {
  card: Card;
  className?: string;
}

/**
 * A small paper index card: rank + suit symbol, red pencil for hearts and
 * diamonds, ink for spades and clubs. Purely decorative — the parent control
 * supplies the accessible name.
 */
function CardFace({ card, className }: CardFaceProps) {
  return (
    <span
      className={[styles.face, isRed(card) ? styles.red : styles.black, className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <span className={styles.rank}>{rankLabel(card.rank)}</span>
      <span className={styles.suit}>{suitSymbol(card.suit)}</span>
    </span>
  );
}

export default CardFace;
