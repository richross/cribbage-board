import { useId, useState } from 'react';
import Key from '../../components/Key/Key';
import Button from '../../components/Button/Button';
import VisuallyHidden from '../../components/VisuallyHidden/VisuallyHidden';
import styles from './NumberPad.module.css';

export interface NumberPadProps {
  trackLabel: string;
  onConfirm: (amount: number) => void;
  onCancel: () => void;
}

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['0'],
];

/** Inline number entry for scores larger than the +1..+6 quick keys cover (1-29). */
function NumberPad({ trackLabel, onConfirm, onCancel }: NumberPadProps) {
  const [digits, setDigits] = useState('');
  const displayId = useId();

  const value = digits === '' ? null : Number.parseInt(digits, 10);
  const isValid = value !== null && value >= 1 && value <= 29;
  const showError = digits !== '' && !isValid;

  const pressDigit = (digit: string) => {
    setDigits((prev) => (prev.length >= 2 ? prev : `${prev}${digit}`));
  };

  const backspace = () => setDigits((prev) => prev.slice(0, -1));

  const confirm = () => {
    if (!isValid || value === null) return;
    onConfirm(value);
  };

  return (
    <div className={styles.pad} role="group" aria-label={`Add points, ${trackLabel}`}>
      <div className={styles.display}>
        <VisuallyHidden>
          <span id={displayId}>Points to add</span>
        </VisuallyHidden>
        <span
          className={styles.value}
          aria-labelledby={displayId}
          aria-live="polite"
          data-testid="number-pad-display"
        >
          {digits || '0'}
        </span>
        {showError ? <p className={styles.error}>Enter 1 to 29</p> : null}
      </div>
      <div className={styles.grid}>
        {DIGIT_ROWS.map((row, rowIndex) => (
          <div className={styles.row} key={rowIndex}>
            {row.map((digit) => (
              <Key key={digit} type="button" onClick={() => pressDigit(digit)} aria-label={`Digit ${digit}`}>
                {digit}
              </Key>
            ))}
          </div>
        ))}
        <Key type="button" onClick={backspace} aria-label="Backspace" disabled={digits === ''}>
          ⌫
        </Key>
      </div>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={confirm} disabled={!isValid}>
          Add {isValid ? value : ''}
        </Button>
      </div>
    </div>
  );
}

export default NumberPad;
