import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, useAnnounce } from '../../../components';
import { highlightText } from '../lib/highlight';
import { searchRules } from '../lib/search';
import type { SearchResult } from '../lib/search';
import styles from './SearchPanel.module.css';

const DEBOUNCE_MS = 80;

/**
 * The rules index's sticky search field: instant (debounced ~80ms),
 * prefix + fuzzy MiniSearch results grouped as "section › subheading"
 * with a highlighted ~160-char snippet, a result count announced
 * politely, a no-results state, and a clear (×) button. Escape clears.
 * ArrowDown from the field moves focus into the results.
 */
function SearchPanel() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const navigate = useNavigate();
  const announce = useAnnounce();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => searchRules(debouncedQuery), [debouncedQuery]);
  const trimmed = debouncedQuery.trim();

  useEffect(() => {
    if (!trimmed) {
      return;
    }
    const count = results.length;
    announce(`${count} result${count === 1 ? '' : 's'} for "${trimmed}"`);
    // Only re-announce when the settled query or its result count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, results.length]);

  const selectResult = (result: SearchResult) => {
    navigate(`/rules/${result.sectionId}?h=${result.chunkSlug}&q=${encodeURIComponent(trimmed)}`);
  };

  const clear = () => {
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      clear();
      return;
    }
    if (event.key === 'ArrowDown' && results.length > 0) {
      event.preventDefault();
      resultRefs.current[0]?.focus();
    }
  };

  const handleResultKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      resultRefs.current[Math.min(index + 1, results.length - 1)]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) {
        inputRef.current?.focus();
      } else {
        resultRefs.current[index - 1]?.focus();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      clear();
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.fieldRow}>
        <div className={styles.fieldWrap}>
          <Field
            ref={inputRef}
            label="Search rules"
            type="search"
            placeholder="Search rules — try 'go' or 'nobs'"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            aria-controls="rules-search-results"
            aria-expanded={results.length > 0}
            className={styles.field}
          />
        </div>
        {query ? (
          <button type="button" className={styles.clear} onClick={clear} aria-label="Clear search">
            ×
          </button>
        ) : null}
      </div>

      {trimmed ? (
        <div id="rules-search-results" className={styles.results}>
          <p className={styles.count}>
            {results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{trimmed}&rdquo;
          </p>
          {results.length === 0 ? (
            <p className={styles.noResults}>
              No rules mention &ldquo;{trimmed}&rdquo;. Try &ldquo;crib&rdquo;, &ldquo;skunk&rdquo; or &ldquo;run&rdquo;.
            </p>
          ) : (
            <ul className={styles.list}>
              {results.map((result, index) => (
                <li key={`${result.sectionId}::${result.chunkSlug}`}>
                  <button
                    type="button"
                    ref={(el) => {
                      resultRefs.current[index] = el;
                    }}
                    className={styles.result}
                    onClick={() => selectResult(result)}
                    onKeyDown={(event) => handleResultKeyDown(event, index)}
                  >
                    <span className={styles.resultPath}>
                      {result.sectionTitle} <span aria-hidden="true">›</span> {result.chunkTitle}
                    </span>
                    <span className={styles.snippet}>{highlightText(result.snippet, trimmed, `snippet-${index}`)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default SearchPanel;
