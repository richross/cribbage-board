export interface RulesFrontmatter {
  id: string;
  title: string;
  order: number;
  summary: string;
  keywords: string[];
}

export interface ParsedMarkdownFile {
  frontmatter: RulesFrontmatter;
  body: string;
}

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Strips matching single or double quotes from a scalar YAML value.
 */
function unquote(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

/**
 * Parses a `[a, b, c]` flow-sequence into a string array. Only supports the
 * flat, unquoted-or-quoted-scalar form used by this project's content —
 * not the full YAML spec.
 */
function parseFlowArray(value: string): string[] {
  const inner = value.slice(1, -1).trim();
  if (inner.length === 0) {
    return [];
  }
  return inner.split(',').map((item) => unquote(item.trim()));
}

/**
 * Hand-written parser for the small, flat YAML frontmatter block used by
 * the rules content files: string keys, an integer `order`, and one flow
 * array (`keywords`). Deliberately not a general YAML parser.
 */
export function parseFrontmatter(raw: string): ParsedMarkdownFile {
  const match = FRONTMATTER_BLOCK.exec(raw);
  if (!match) {
    throw new Error('Rules content file is missing a --- frontmatter block.');
  }
  const [, yaml, body] = match;
  const data: Record<string, string | string[]> = {};

  for (const line of yaml.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();
    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      data[key] = parseFlowArray(rawValue);
    } else {
      data[key] = unquote(rawValue);
    }
  }

  const { id, title, order, summary, keywords } = data;
  if (typeof id !== 'string' || !id) {
    throw new Error('Rules content frontmatter is missing "id".');
  }
  if (typeof title !== 'string' || !title) {
    throw new Error(`Rules content frontmatter for "${id}" is missing "title".`);
  }
  if (typeof order !== 'string' || Number.isNaN(Number(order))) {
    throw new Error(`Rules content frontmatter for "${id}" is missing a numeric "order".`);
  }
  if (typeof summary !== 'string' || !summary) {
    throw new Error(`Rules content frontmatter for "${id}" is missing "summary".`);
  }

  return {
    frontmatter: {
      id,
      title,
      order: Number(order),
      summary,
      keywords: Array.isArray(keywords) ? keywords : [],
    },
    body: body.trimStart(),
  };
}
