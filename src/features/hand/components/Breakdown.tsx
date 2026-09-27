import { Link } from 'react-router-dom';
import type { ComboCategory, HandScore } from '../../../domain/hand';
import { WorkedLine } from '../../../components';
import type { Slots } from '../state';
import { STARTER_INDEX } from '../state';
import { coloredLabel } from './coloredLabel';
import styles from './Breakdown.module.css';

const NO_COMBO_TEXT: Record<ComboCategory, string> = {
  fifteen: 'No fifteens',
  pair: 'No pairs',
  run: 'No runs',
  flush: 'No flush',
  nobs: 'No nobs',
};

export interface BreakdownProps {
  slots: Slots;
  isCrib: boolean;
  score: HandScore | null;
  highlightedComboId: string | null;
  onToggleCombo: (id: string) => void;
  onHoverCombo: (id: string | null) => void;
}

function incompleteMessage(slots: Slots): string {
  const filledCount = slots.filter((card) => card !== null).length;
  const missing = 5 - filledCount;
  const onlyStarterMissing = slots[STARTER_INDEX] === null && missing === 1;
  if (onlyStarterMissing) {
    return 'Pick the starter';
  }
  return `Pick ${missing} more card${missing === 1 ? '' : 's'}`;
}

/**
 * The worked solution sheet: a boxed double-ruled total, then Fifteens,
 * Pairs, Runs, Flush, Nobs in order with subtotals. Every combo is a
 * toggleable button that highlights its cards in the slots row.
 */
function Breakdown({ slots, isCrib, score, highlightedComboId, onToggleCombo, onHoverCombo }: BreakdownProps) {
  if (!score) {
    return (
      <div className={styles.breakdown}>
        <p className={styles.incomplete}>{incompleteMessage(slots)}</p>
      </div>
    );
  }

  const note = score.total === 0 ? 'Zero — players call this a "nineteen" hand.' : score.total === 29 ? 'The perfect hand!' : null;

  return (
    <div className={styles.breakdown}>
      <WorkedLine variant="total" label={isCrib ? 'Crib' : 'Hand'} value={score.total} />
      {note ? <p className={styles.note}>{note}</p> : null}
      {score.categories.map((category) => (
        <div className={styles.category} key={category.category}>
          <WorkedLine variant="subtotal" label={category.title} value={category.subtotal} />
          {category.combos.length === 0 ? (
            <p className={styles.quiet}>{NO_COMBO_TEXT[category.category]}</p>
          ) : (
            category.combos.map((combo) => (
              <button
                key={combo.id}
                type="button"
                className={styles.comboButton}
                aria-pressed={combo.id === highlightedComboId}
                onClick={() => onToggleCombo(combo.id)}
                onMouseEnter={() => onHoverCombo(combo.id)}
                onMouseLeave={() => onHoverCombo(null)}
                onFocus={() => onHoverCombo(combo.id)}
                onBlur={() => onHoverCombo(null)}
              >
                <WorkedLine label={coloredLabel(combo.label)} value={combo.points} />
              </button>
            ))
          )}
        </div>
      ))}
      <Link to="/rules/scoring" className={styles.rulesLink}>
        How scoring works
      </Link>
    </div>
  );
}

export default Breakdown;
