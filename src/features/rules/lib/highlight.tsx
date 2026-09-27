import type { ReactNode } from 'react';
import { escapeRegExp } from './search';

/**
 * Splits `text` into an array of plain strings and `<mark>` elements
 * wrapping every case-insensitive occurrence of any whitespace-separated
 * term in `query`. The query is escaped before use in a RegExp — it is
 * never interpreted as HTML or markup, so even a query containing HTML
 * (e.g. `<img src=x onerror=...>`) is only ever matched and rendered as
 * literal text.
 */
export function highlightText(text: string, query: string, keyPrefix = 'mark'): ReactNode[] {
  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return [text];
  }

  const pattern = terms
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const re = new RegExp(`(?:${pattern})`, 'gi');

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text))) {
    if (match[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(<mark key={`${keyPrefix}-${key++}`}>{match[0]}</mark>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
