import { parseFrontmatter } from './frontmatter';
import { collectHeadings, collectPlainText, parseMarkdown } from './markdown';
import type { HeadingBlock, MarkdownBlock } from './markdown';
import { createSlugger } from './slug';

export interface SubheadingChunk {
  slug: string;
  title: string;
  text: string;
}

export interface RulesSection {
  id: string;
  title: string;
  order: number;
  summary: string;
  keywords: string[];
  blocks: MarkdownBlock[];
  /** Top-level (`##`) subheadings, for the in-section "On this page" list. */
  headings: HeadingBlock[];
  /** One chunk per `##` subheading (including any nested `###` body), for search. */
  chunks: SubheadingChunk[];
}

function buildChunks(blocks: MarkdownBlock[]): SubheadingChunk[] {
  const chunks: SubheadingChunk[] = [];
  let current: { slug: string; title: string; blocks: MarkdownBlock[] } | null = null;

  for (const block of blocks) {
    if (block.type === 'heading' && block.level === 2) {
      if (current) {
        chunks.push({ slug: current.slug, title: current.title, text: collectPlainText(current.blocks) });
      }
      // The heading's own text is indexed separately as `chunkTitle` (with a
      // higher search boost) — it's deliberately excluded here so snippets
      // don't open by repeating the subheading verbatim.
      current = { slug: block.slug, title: block.text, blocks: [] };
    } else if (current) {
      current.blocks.push(block);
    }
    // Content before the first "##" heading (none in this content set) is
    // intentionally not indexed as its own chunk.
  }

  if (current) {
    chunks.push({ slug: current.slug, title: current.title, text: collectPlainText(current.blocks) });
  }

  return chunks;
}

const rawModules = import.meta.glob('../content/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;

function loadSections(): RulesSection[] {
  return Object.values(rawModules)
    .map((raw) => {
      const { frontmatter, body } = parseFrontmatter(raw);
      const slugger = createSlugger();
      const blocks = parseMarkdown(body, slugger);
      const headings = collectHeadings(blocks).filter((heading) => heading.level === 2);
      const chunks = buildChunks(blocks);
      return { ...frontmatter, blocks, headings, chunks };
    })
    .sort((a, b) => a.order - b.order);
}

/** All rules sections, parsed once at module load and sorted by `order`. */
export const rulesSections: RulesSection[] = loadSections();

export function getSectionById(id: string): RulesSection | undefined {
  return rulesSections.find((section) => section.id === id);
}

export interface AdjacentSections {
  prev?: RulesSection;
  next?: RulesSection;
}

/** Returns the previous/next sections in reading order, for prev/next links. */
export function getAdjacentSections(id: string): AdjacentSections {
  const index = rulesSections.findIndex((section) => section.id === id);
  if (index === -1) {
    return {};
  }
  return {
    prev: index > 0 ? rulesSections[index - 1] : undefined,
    next: index < rulesSections.length - 1 ? rulesSections[index + 1] : undefined,
  };
}
