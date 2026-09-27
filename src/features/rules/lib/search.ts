import MiniSearch from 'minisearch';
import { rulesSections } from './sections';

export interface SearchDocument {
  id: string;
  sectionId: string;
  sectionTitle: string;
  chunkSlug: string;
  chunkTitle: string;
  summary: string;
  keywords: string;
  text: string;
}

export interface SearchResult {
  sectionId: string;
  sectionTitle: string;
  chunkSlug: string;
  chunkTitle: string;
  score: number;
  snippet: string;
}

/** Builds the flat list of search documents, one per section subheading. */
export function buildSearchDocuments(): SearchDocument[] {
  const docs: SearchDocument[] = [];
  for (const section of rulesSections) {
    // The section's own title/summary/keywords are always searchable, even
    // for a section whose body has no subheadings above the first one.
    for (const chunk of section.chunks) {
      docs.push({
        id: `${section.id}::${chunk.slug}`,
        sectionId: section.id,
        sectionTitle: section.title,
        chunkSlug: chunk.slug,
        chunkTitle: chunk.title,
        summary: section.summary,
        keywords: section.keywords.join(' '),
        text: chunk.text,
      });
    }
  }
  return docs;
}

let cachedIndex: MiniSearch<SearchDocument> | null = null;

/**
 * Builds (or returns the cached) MiniSearch index over section title,
 * summary, keywords, and each subheading's chunk text, so results jump to
 * the exact spot rather than just the section. Built once, lazily, on
 * first use (module load or first search field focus, whichever is
 * first) rather than eagerly at import time.
 */
export function getSearchIndex(): MiniSearch<SearchDocument> {
  if (cachedIndex) {
    return cachedIndex;
  }
  const miniSearch = new MiniSearch<SearchDocument>({
    idField: 'id',
    fields: ['sectionTitle', 'chunkTitle', 'summary', 'keywords', 'text'],
    storeFields: ['sectionId', 'sectionTitle', 'chunkSlug', 'chunkTitle', 'text'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { chunkTitle: 3, sectionTitle: 2, keywords: 2, summary: 1.5 },
    },
  });
  miniSearch.addAll(buildSearchDocuments());
  cachedIndex = miniSearch;
  return cachedIndex;
}

const SNIPPET_RADIUS = 80;

/** Escapes regex metacharacters so a raw query can be used inside a RegExp safely. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function firstMatchIndex(text: string, terms: string[]): number {
  const lowerText = text.toLowerCase();
  let earliest = -1;
  for (const term of terms) {
    const index = lowerText.indexOf(term.toLowerCase());
    if (index !== -1 && (earliest === -1 || index < earliest)) {
      earliest = index;
    }
  }
  return earliest;
}

/**
 * Builds a ~160-character snippet centered on the first query match inside
 * `text`, so search results show the exact spot rather than the start of
 * the chunk. Falls back to the start of the text when no term is found
 * (e.g. a fuzzy-only match).
 */
export function buildSnippet(text: string, query: string): string {
  const terms = query.split(/\s+/).filter(Boolean);
  const matchIndex = terms.length > 0 ? firstMatchIndex(text, terms) : -1;
  const center = matchIndex === -1 ? 0 : matchIndex;
  const start = Math.max(0, center - SNIPPET_RADIUS);
  const end = Math.min(text.length, center + SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

/** Runs a search over the rules content, returning results with ready-to-highlight snippets. */
export function searchRules(query: string, maxResults = 20): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }
  const index = getSearchIndex();
  const hits = index.search(trimmed);
  return hits.slice(0, maxResults).map((hit) => ({
    sectionId: hit.sectionId as string,
    sectionTitle: hit.sectionTitle as string,
    chunkSlug: hit.chunkSlug as string,
    chunkTitle: hit.chunkTitle as string,
    score: hit.score,
    snippet: buildSnippet(hit.text as string, trimmed),
  }));
}
