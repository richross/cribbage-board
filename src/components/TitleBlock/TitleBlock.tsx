import type { ReactNode } from 'react';
import styles from './TitleBlock.module.css';

export interface TitleBlockCell {
  key: string;
  content: ReactNode;
}

export interface TitleBlockProps {
  cells: TitleBlockCell[];
  className?: string;
}

/**
 * A ruled strip of cells like an engineering pad header, e.g.
 * `2 PLAYERS │ HAND 7 │ DEALER ● P1`.
 */
function TitleBlock({ cells, className }: TitleBlockProps) {
  return (
    <div className={[styles.strip, className].filter(Boolean).join(' ')}>
      {cells.map((cell) => (
        <span key={cell.key} className={[styles.cell, 'label'].join(' ')}>
          {cell.content}
        </span>
      ))}
    </div>
  );
}

export default TitleBlock;
