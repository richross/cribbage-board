import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { highlightText } from './highlight';

describe('highlightText', () => {
  it('wraps a matching term in <mark>', () => {
    const { container } = render(<div>{highlightText('The go is worth one point.', 'go')}</div>);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0].textContent).toBe('go');
  });

  it('is case-insensitive and matches every occurrence', () => {
    const { container } = render(<div>{highlightText('Go go GO', 'go')}</div>);
    expect(container.querySelectorAll('mark')).toHaveLength(3);
  });

  it('highlights multiple terms from a multi-word query', () => {
    const { container } = render(<div>{highlightText('his heels and his nobs', 'heels nobs')}</div>);
    const marks = Array.from(container.querySelectorAll('mark')).map((m) => m.textContent);
    expect(marks).toEqual(['heels', 'nobs']);
  });

  it('never interprets query text as HTML — it renders as literal text', () => {
    const { container } = render(<div>{highlightText('some text with <img src=x onerror=alert(1)> inside', '<img src=x onerror=alert(1)>')}</div>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('does not throw and returns the plain text for regex special characters', () => {
    expect(() => render(<div>{highlightText('a (b) * c', '(b)')}</div>)).not.toThrow();
  });

  it('returns the original text unchanged when the query is blank', () => {
    const { container } = render(<div>{highlightText('plain text', '')}</div>);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.textContent).toBe('plain text');
  });
});
