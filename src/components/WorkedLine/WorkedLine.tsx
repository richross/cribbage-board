import type { ReactNode } from 'react';
import styles from './WorkedLine.module.css';

export type WorkedLineVariant = 'item' | 'subtotal' | 'total';

export interface WorkedLineProps {
  label: ReactNode;
  value: ReactNode;
  variant?: WorkedLineVariant;
  className?: string;
}

/**
 * A Score Hand breakdown line: `5♥ + J♠ = 15 ······· 2`. Item rows are
 * plain, the category subtotal is single-ruled above, and the grand total
 * is double-ruled and boxed.
 */
function WorkedLine({ label, value, variant = 'item', className }: WorkedLineProps) {
  const variantClass = variant === 'subtotal' ? styles.subtotal : variant === 'total' ? styles.total : '';

  return (
    <div className={[styles.line, variantClass, className].filter(Boolean).join(' ')}>
      <span className={styles.label}>{label}</span>
      <span className={styles.leader} aria-hidden="true" />
      <span className={[styles.value, 'tabular-nums'].join(' ')}>{value}</span>
    </div>
  );
}

export default WorkedLine;
