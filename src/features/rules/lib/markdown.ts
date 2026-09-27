import { createSlugger } from './slug';

export interface HeadingBlock {
  type: 'heading';
  level: 2 | 3;
  text: string;
  slug: string;
}

export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface TableBlock {
  type: 'table';
  header: string[];
  rows: string[][];
}

export interface BlockquoteBlock {
  type: 'blockquote';
  blocks: MarkdownBlock[];
}

export type MarkdownBlock = HeadingBlock | ParagraphBlock | ListBlock | TableBlock | BlockquoteBlock;

const HEADING_RE = /^(#{2,3})\s+(.*)$/;
const ORDERED_ITEM_RE = /^\d+\.\s+(.*)$/;
const UNORDERED_ITEM_RE = /^-\s+(.*)$/;

function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) {
    trimmed = trimmed.slice(1);
  }
  if (trimmed.endsWith('|')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.split('|').map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(line.trim());
}

/**
 * Parses first-party rules Markdown (headings, paragraphs, lists, tables,
 * and "Example" blockquotes) into a small block AST, one block per group
 * of related lines. Every source line in this content is a complete
 * paragraph/list-item/table-row on its own (no hard-wrapped continuations),
 * which keeps this parser a single flat pass rather than a full CommonMark
 * implementation.
 */
export function parseMarkdown(markdown: string, slugger = createSlugger()): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  return parseLines(lines, slugger);
}

function parseLines(lines: string[], slugger: (text: string) => string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = heading[1].length as 2 | 3;
      const text = heading[2].trim();
      blocks.push({ type: 'heading', level, text, slug: slugger(text) });
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const header = splitTableRow(tableLines[0]);
      const bodyLines = tableLines.slice(1).filter((tableLine) => !isTableSeparator(tableLine));
      const rows = bodyLines.map(splitTableRow);
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) {
        if (lines[i].trim() === '') {
          // A blank line only continues the blockquote if another quoted
          // line follows; otherwise it ends the block.
          if (i + 1 < lines.length && lines[i + 1].startsWith('>')) {
            quoteLines.push('');
            i += 1;
            continue;
          }
          break;
        }
        const stripped = lines[i].slice(1);
        quoteLines.push(stripped.startsWith(' ') ? stripped.slice(1) : stripped);
        i += 1;
      }
      blocks.push({ type: 'blockquote', blocks: parseLines(quoteLines, slugger) });
      continue;
    }

    const orderedItem = ORDERED_ITEM_RE.exec(line);
    if (orderedItem) {
      const items: string[] = [];
      while (i < lines.length) {
        const match = ORDERED_ITEM_RE.exec(lines[i]);
        if (!match) break;
        items.push(match[1].trim());
        i += 1;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    const unorderedItem = UNORDERED_ITEM_RE.exec(line);
    if (unorderedItem) {
      const items: string[] = [];
      while (i < lines.length) {
        const match = UNORDERED_ITEM_RE.exec(lines[i]);
        if (!match) break;
        items.push(match[1].trim());
        i += 1;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    // Paragraph: this content's paragraphs are always a single source line.
    blocks.push({ type: 'paragraph', text: line.trim() });
    i += 1;
  }

  return blocks;
}

/** Collects every h2/h3 heading from a parsed block tree, in document order. */
export function collectHeadings(blocks: MarkdownBlock[]): HeadingBlock[] {
  const headings: HeadingBlock[] = [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      headings.push(block);
    }
  }
  return headings;
}

/**
 * Strips `**bold**` / `*italic*` markdown emphasis markers, leaving the inner
 * text bare. Used for search-indexed/snippet text, which is plain text (no
 * inline styling), so raw asterisks would otherwise leak into the UI.
 */
export function stripEmphasisMarkers(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*([^*]+?)\*/g, '$1');
}

/** Flattens every plain-text string out of a block tree, for search indexing. */
export function collectPlainText(blocks: MarkdownBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
      case 'paragraph':
        parts.push(block.text);
        break;
      case 'list':
        parts.push(...block.items);
        break;
      case 'table':
        parts.push(block.header.join(' '));
        for (const row of block.rows) {
          parts.push(row.join(' '));
        }
        break;
      case 'blockquote':
        parts.push(collectPlainText(block.blocks));
        break;
      default:
        break;
    }
  }
  return stripEmphasisMarkers(parts.join(' '));
}
