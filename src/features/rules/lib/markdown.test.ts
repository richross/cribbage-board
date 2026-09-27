import { describe, expect, it } from 'vitest';
import { collectHeadings, collectPlainText, parseMarkdown } from './markdown';
import { createSlugger } from './slug';

describe('parseMarkdown', () => {
  it('parses headings with stable slugs', () => {
    const blocks = parseMarkdown('## The Go\n\nSome text.\n\n### A subheading\n');
    expect(blocks[0]).toEqual({ type: 'heading', level: 2, text: 'The Go', slug: 'the-go' });
    expect(blocks[2]).toMatchObject({ type: 'heading', level: 3, text: 'A subheading', slug: 'a-subheading' });
  });

  it('parses a paragraph', () => {
    const blocks = parseMarkdown('Just a sentence.');
    expect(blocks).toEqual([{ type: 'paragraph', text: 'Just a sentence.' }]);
  });

  it('parses an unordered list', () => {
    const blocks = parseMarkdown('- First\n- Second\n- Third');
    expect(blocks).toEqual([{ type: 'list', ordered: false, items: ['First', 'Second', 'Third'] }]);
  });

  it('parses an ordered list', () => {
    const blocks = parseMarkdown('1. Deal\n2. Discard\n3. Cut');
    expect(blocks).toEqual([{ type: 'list', ordered: true, items: ['Deal', 'Discard', 'Cut'] }]);
  });

  it('parses a table with header and rows, dropping the separator', () => {
    const blocks = parseMarkdown('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |');
    expect(blocks).toEqual([
      {
        type: 'table',
        header: ['A', 'B'],
        rows: [
          ['1', '2'],
          ['3', '4'],
        ],
      },
    ]);
  });

  it('parses a blockquote as a worked-example block containing its own blocks', () => {
    const blocks = parseMarkdown('> **Example:** Hand = 5♠, 5♣.\n>\n> - **Fifteens:** 8 points.\n> - **Total: 8.**');
    expect(blocks).toHaveLength(1);
    const [quote] = blocks;
    if (quote.type !== 'blockquote') throw new Error('expected blockquote');
    expect(quote.blocks[0]).toEqual({ type: 'paragraph', text: '**Example:** Hand = 5♠, 5♣.' });
    expect(quote.blocks[1]).toEqual({
      type: 'list',
      ordered: false,
      items: ['**Fifteens:** 8 points.', '**Total: 8.**'],
    });
  });

  it('de-duplicates heading slugs across the whole document using one slugger', () => {
    const slugger = createSlugger();
    const blocks = parseMarkdown('## Example\n\nOne.\n\n## Example\n\nTwo.', slugger);
    const headings = collectHeadings(blocks);
    expect(headings.map((h) => h.slug)).toEqual(['example', 'example-2']);
  });
});

describe('collectHeadings', () => {
  it('returns only heading blocks in document order', () => {
    const blocks = parseMarkdown('## One\n\nText\n\n### Two\n\nMore text\n\n## Three');
    expect(collectHeadings(blocks).map((h) => h.text)).toEqual(['One', 'Two', 'Three']);
  });
});

describe('collectPlainText', () => {
  it('flattens headings, paragraphs, lists, tables and blockquotes into one string', () => {
    const blocks = parseMarkdown('## Heading\n\nA paragraph.\n\n- item one\n\n| H |\n|---|\n| cell |\n\n> **Example:** quoted.');
    const text = collectPlainText(blocks);
    expect(text).toContain('Heading');
    expect(text).toContain('A paragraph.');
    expect(text).toContain('item one');
    expect(text).toContain('cell');
    expect(text).toContain('Example');
  });
});
