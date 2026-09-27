import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from './frontmatter';

describe('parseFrontmatter', () => {
  it('parses id, title, order, summary and keywords', () => {
    const raw = `---
id: pegging
title: Pegging
order: 5
summary: The card-by-card play where points are earned quickly.
keywords: [go, thirty-one, fifteen]
---

## The basic rhythm

Once the starter is turned, pegging begins.
`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter).toEqual({
      id: 'pegging',
      title: 'Pegging',
      order: 5,
      summary: 'The card-by-card play where points are earned quickly.',
      keywords: ['go', 'thirty-one', 'fifteen'],
    });
    expect(body).toContain('## The basic rhythm');
  });

  it('defaults keywords to an empty array when absent', () => {
    const raw = `---
id: overview
title: Overview
order: 1
summary: What cribbage is.
---

Body text.
`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.keywords).toEqual([]);
  });

  it('handles an empty keywords array', () => {
    const raw = `---
id: overview
title: Overview
order: 1
summary: What cribbage is.
keywords: []
---

Body text.
`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.keywords).toEqual([]);
  });

  it('strips quotes from quoted scalars', () => {
    const raw = `---
id: overview
title: "Overview: An Intro"
order: 1
summary: 'What cribbage is.'
---

Body text.
`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.title).toBe('Overview: An Intro');
    expect(frontmatter.summary).toBe('What cribbage is.');
  });

  it('throws when the frontmatter block is missing', () => {
    expect(() => parseFrontmatter('# No frontmatter here')).toThrow(/frontmatter/i);
  });

  it('throws when a required field is missing', () => {
    const raw = `---
id: overview
title: Overview
---

Body text.
`;
    expect(() => parseFrontmatter(raw)).toThrow(/order/i);
  });
});
