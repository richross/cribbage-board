import { useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import MarkdownBody from './components/MarkdownBody';
import RulesLayout from './components/RulesLayout';
import { getAdjacentSections, getSectionById } from './lib/sections';
import styles from './RulesSectionPage.module.css';

/**
 * `#/rules/:sectionId` — a single section: title, 68ch body, an "on this
 * page" list of `##` subheadings, prev/next links, and back to the index.
 *
 * Deep links to a subheading use `?h=<slug>` (e.g. `#/rules/pegging?h=the-go`),
 * a HashRouter-compatible query string on top of the hash route — it scrolls
 * to and focuses that heading on load. When arriving from a search result,
 * `?q=<query>` additionally highlights the matched terms in `<mark>` until
 * the search is cleared from this page.
 */
function RulesSectionPage() {
  const { sectionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = sectionId ? getSectionById(sectionId) : undefined;
  const headingSlug = searchParams.get('h');
  const highlightQuery = searchParams.get('q') ?? undefined;
  const bodyRef = useRef<HTMLDivElement>(null);

  useDocumentTitle(section ? section.title : 'Rules');

  useEffect(() => {
    if (!section || !headingSlug) {
      return;
    }
    // The app shell also focuses this page's <h1> on route change; defer
    // to the next tick so this section-heading focus wins instead.
    const timer = window.setTimeout(() => {
      const target = bodyRef.current?.querySelector<HTMLElement>(`#${CSS.escape(headingSlug)}`);
      if (target) {
        try {
          target.scrollIntoView({ block: 'start' });
        } catch {
          // jsdom (unit tests) does not implement scrollIntoView; ignore there.
        }
        target.focus();
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [section, headingSlug]);

  if (!section) {
    return (
      <RulesLayout>
        <h1>Section not found</h1>
        <p>
          That rules section doesn&rsquo;t exist. <Link to="/rules">Back to Rules</Link>.
        </p>
      </RulesLayout>
    );
  }

  const { prev, next } = getAdjacentSections(section.id);

  const clearHighlight = () => {
    const next2 = new URLSearchParams(searchParams);
    next2.delete('q');
    setSearchParams(next2, { replace: true });
  };

  return (
    <RulesLayout>
      <p className={styles.back}>
        <Link to="/rules">← All rules</Link>
      </p>
      <h1>{section.title}</h1>
      <p className={styles.summary}>{section.summary}</p>

      {highlightQuery ? (
        <p className={styles.highlightNotice}>
          Highlighting &ldquo;{highlightQuery}&rdquo;.{' '}
          <button type="button" className={styles.clearHighlight} onClick={clearHighlight}>
            Clear
          </button>
        </p>
      ) : null}

      {section.headings.length > 1 ? (
        <nav className={styles.toc} aria-label="On this page">
          <p className={styles.tocLabel}>On this page</p>
          <ul>
            {section.headings.map((heading) => (
              <li key={heading.slug}>
                <Link to={`/rules/${section.id}?h=${heading.slug}`}>{heading.text}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div ref={bodyRef}>
        <MarkdownBody blocks={section.blocks} highlightQuery={highlightQuery} />
      </div>

      <nav className={styles.adjacent} aria-label="Other sections">
        <div>
          {prev ? (
            <Link to={`/rules/${prev.id}`} className={styles.adjacentLink}>
              <span className={styles.adjacentLabel}>← Previous</span>
              <span>{prev.title}</span>
            </Link>
          ) : null}
        </div>
        <div>
          {next ? (
            <Link to={`/rules/${next.id}`} className={[styles.adjacentLink, styles.adjacentNext].join(' ')}>
              <span className={styles.adjacentLabel}>Next →</span>
              <span>{next.title}</span>
            </Link>
          ) : null}
        </div>
      </nav>
    </RulesLayout>
  );
}

export default RulesSectionPage;
