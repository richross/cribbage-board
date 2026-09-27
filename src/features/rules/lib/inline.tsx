import type { ReactNode } from 'react';
import { highlightText } from './highlight';
import styles from '../components/MarkdownBody.module.css';

const SUIT_RE = /([♥♦])/;
const INLINE_RE = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;

/**
 * Colors ♥/♦ characters in red pencil (a text transform applied at render,
 * per direction.md's pencil-color rule) and, when `highlightQuery` is set,
 * wraps matching search terms in `<mark>` within the remaining plain text.
 */
function colorSuits(text: string, keyPrefix: string, highlightQuery?: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const parts = text.split(SUIT_RE);
  parts.forEach((part, index) => {
    if (part === '♥' || part === '♦') {
      nodes.push(
        <span key={`${keyPrefix}-suit${index}`} className={styles.redSuit}>
          {part}
        </span>,
      );
    } else if (part) {
      if (highlightQuery) {
        nodes.push(...highlightText(part, highlightQuery, `${keyPrefix}-mark${index}`));
      } else {
        nodes.push(part);
      }
    }
  });
  return nodes;
}

/**
 * Renders a single line of first-party Markdown inline syntax (`**bold**`,
 * `*italic*`) plus card-suit coloring and optional search-query
 * highlighting, entirely as React elements — nothing here is ever parsed
 * as HTML, so untrusted-looking text (including a search query) can never
 * inject markup.
 */
export function renderInline(text: string, keyPrefix: string, highlightQuery?: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(...colorSuits(text.slice(lastIndex, match.index), `${keyPrefix}-t${i++}`, highlightQuery));
    }
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i++}`}>{colorSuits(match[1], `${keyPrefix}-bi${i}`, highlightQuery)}</strong>,
      );
    } else if (match[2] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-e${i++}`}>{colorSuits(match[2], `${keyPrefix}-ei${i}`, highlightQuery)}</em>);
    }
    lastIndex = INLINE_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(...colorSuits(text.slice(lastIndex), `${keyPrefix}-t${i++}`, highlightQuery));
  }

  return nodes;
}
