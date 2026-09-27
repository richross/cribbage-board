/**
 * Turns heading text into a stable, URL-safe slug for deep links
 * (e.g. `#/rules/pegging?h=the-go`). Lowercases, strips punctuation,
 * and collapses whitespace/punctuation runs into single hyphens.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Creates a slugger that de-duplicates repeated headings within one
 * document by appending `-2`, `-3`, etc., so every heading id on a page
 * is unique even if two headings share the same text.
 */
export function createSlugger() {
  const seen = new Map<string, number>();
  return function slugger(text: string): string {
    const base = slugify(text) || 'section';
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}
