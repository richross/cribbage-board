import { useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Card, Rank, Suit } from '../../../domain/cards';
import { rankLabel, suitName, suitSymbol } from '../../../domain/cards';
import { Button, Field, Key, SegmentedControl } from '../../../components';
import { parseHandText } from '../parseHandText';
import styles from './CardPicker.module.css';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = Array.from({ length: 13 }, (_, i) => (i + 1) as Rank);
const GRID_COLUMNS = 5;

export interface CardPickerProps {
  isUsed: (card: Card) => boolean;
  onPick: (card: Card) => void;
  onApplyText: (hand: Card[], starter: Card) => void;
}

/**
 * The suit + rank picker: a suit segmented control, a 13-rank key grid
 * (never 13 columns wide on phones), and an optional "type cards" power
 * entry parsed with the domain's parseCard.
 */
function CardPicker({ isUsed, onPick, onApplyText }: CardPickerProps) {
  const [suit, setSuit] = useState<Suit>('S');
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [textEntryOpen, setTextEntryOpen] = useState(false);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusIndex = (index: number) => {
    const wrapped = ((index % RANKS.length) + RANKS.length) % RANKS.length;
    refs.current[wrapped]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusIndex(index + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusIndex(index - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusIndex(index + GRID_COLUMNS);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusIndex(index - GRID_COLUMNS);
        break;
      case 'Home':
        event.preventDefault();
        focusIndex(0);
        break;
      case 'End':
        event.preventDefault();
        focusIndex(RANKS.length - 1);
        break;
      default:
        break;
    }
  };

  const handleTextSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      return;
    }
    const result = parseHandText(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(undefined);
    setText('');
    onApplyText(result.hand, result.starter);
  };

  return (
    <div className={styles.picker}>
      <SegmentedControl
        label="Suit"
        value={suit}
        onChange={setSuit}
        layout="stacked"
        options={SUITS.map((s) => ({ value: s, label: `${suitSymbol(s)} ${suitName(s)}` }))}
        renderOption={(option, checked) => {
          const red = !checked && (option.value === 'H' || option.value === 'D');
          return (
            <>
              <span aria-hidden="true" className={[styles.suitSymbol, red ? styles.redSuit : ''].filter(Boolean).join(' ')}>
                {suitSymbol(option.value)}
              </span>
              <span className={styles.suitName}>{suitName(option.value)}</span>
            </>
          );
        }}
      />
      <div className={styles.grid} role="group" aria-label={`Rank, ${suitName(suit)}`}>
        {RANKS.map((rank, index) => {
          const card: Card = { rank, suit };
          const used = isUsed(card);
          return (
            <Key
              key={rank}
              ref={(el) => {
                refs.current[index] = el;
              }}
              className={[styles.rankKey, used ? styles.used : ''].filter(Boolean).join(' ')}
              aria-disabled={used ? 'true' : undefined}
              aria-label={`${rankLabel(rank)} of ${suitName(suit)}${used ? ', already used' : ''}`}
              onClick={() => {
                if (!used) {
                  onPick(card);
                }
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {rankLabel(rank)}
            </Key>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.disclosureButton}
        aria-expanded={textEntryOpen}
        onClick={() => setTextEntryOpen((open) => !open)}
      >
        {textEntryOpen ? 'Hide text entry' : 'Type cards instead'}
      </button>
      {textEntryOpen ? (
        <form className={styles.textEntry} onSubmit={handleTextSubmit}>
          <Field
            label="Type cards"
            placeholder="5h 5c 5d jh 5s"
            value={text}
            onChange={(event) => setText(event.target.value)}
            error={error}
          />
          <Button type="submit" variant="secondary" size="sm">
            Use these cards
          </Button>
          <p className={styles.helper}>Last card is the starter, e.g. "5h 5c 5d jh 5s".</p>
        </form>
      ) : null}
    </div>
  );
}

export default CardPicker;
