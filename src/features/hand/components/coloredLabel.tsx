import type { ReactNode } from 'react';
import styles from './Breakdown.module.css';

const RED_SUITS = /[♥♦]/g;

/**
 * Splits a combo/category label on the red-suit glyphs (♥ ♦) and wraps them
 * in red-pencil spans, matching the card faces where hearts and diamonds are
 * drawn in red and spades/clubs in ink.
 */
export function coloredLabel(label: string): ReactNode {
  const parts = label.split(RED_SUITS);
  const matches = label.match(RED_SUITS) ?? [];
  if (matches.length === 0) {
    return label;
  }
  const nodes: ReactNode[] = [];
  parts.forEach((part, index) => {
    if (part) {
      nodes.push(part);
    }
    if (index < matches.length) {
      nodes.push(
        <span key={index} className={styles.redSuit}>
          {matches[index]}
        </span>,
      );
    }
  });
  return nodes;
}
