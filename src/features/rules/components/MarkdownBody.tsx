import type { ReactNode } from 'react';
import type { MarkdownBlock } from '../lib/markdown';
import { renderInline } from '../lib/inline';
import styles from './MarkdownBody.module.css';

export interface MarkdownBodyProps {
  blocks: MarkdownBlock[];
  /** When set, wraps every case-insensitive occurrence of these terms in `<mark>`. */
  highlightQuery?: string;
}

function renderTable(block: Extract<MarkdownBlock, { type: 'table' }>, key: number, captionText: string, highlightQuery?: string) {
  return (
    <div key={key} className={styles.tableWrap}>
      <table>
        <caption className={styles.caption}>{captionText}</caption>
        <thead>
          <tr>
            {block.header.map((cell, cellIndex) => (
              <th key={cellIndex} scope="col">
                {renderInline(cell, `th-${key}-${cellIndex}`, highlightQuery)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{renderInline(cell, `td-${key}-${rowIndex}-${cellIndex}`, highlightQuery)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renders a parsed rules-content block tree as React elements: `##`/`###`
 * headings get a stable `id` (for deep links) and `tabIndex={-1}` (so they
 * can receive programmatic focus without becoming extra tab stops), tables
 * get a real `<caption>` and `scope="col"` headers, and "Example"
 * blockquotes are styled as a ruled worked-example box. Nothing here uses
 * `dangerouslySetInnerHTML` — every node is a real React element, so
 * highlighted search text can never execute as markup.
 */
function MarkdownBody({ blocks, highlightQuery }: MarkdownBodyProps) {
  let captionContext = 'Reference table';

  function renderBlock(block: MarkdownBlock, key: number): ReactNode {
    switch (block.type) {
      case 'heading': {
        captionContext = block.text;
        const headingProps = {
          id: block.slug,
          tabIndex: -1 as const,
          className: block.level === 2 ? styles.h2 : styles.h3,
        };
        return block.level === 2 ? (
          <h2 key={block.slug} {...headingProps}>
            {renderInline(block.text, `h-${block.slug}`, highlightQuery)}
          </h2>
        ) : (
          <h3 key={block.slug} {...headingProps}>
            {renderInline(block.text, `h-${block.slug}`, highlightQuery)}
          </h3>
        );
      }
      case 'paragraph':
        return (
          <p key={key} className={styles.paragraph}>
            {renderInline(block.text, `p-${key}`, highlightQuery)}
          </p>
        );
      case 'list': {
        const items = block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item, `li-${key}-${itemIndex}`, highlightQuery)}</li>
        ));
        return block.ordered ? (
          <ol key={key} className={styles.list}>
            {items}
          </ol>
        ) : (
          <ul key={key} className={styles.list}>
            {items}
          </ul>
        );
      }
      case 'table':
        return renderTable(block, key, captionContext, highlightQuery);
      case 'blockquote':
        return (
          <blockquote key={key} className={styles.example}>
            {block.blocks.map((inner, innerIndex) => renderBlock(inner, innerIndex))}
          </blockquote>
        );
      default:
        return null;
    }
  }

  return <div className={styles.body}>{blocks.map((block, index) => renderBlock(block, index))}</div>;
}

export default MarkdownBody;
