import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Board route by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Board' })).toBeInTheDocument();
  });

  it('renders the primary nav with Board, Score Hand, and Rules', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Board/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Score Hand/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Rules/ })).toBeInTheDocument();
  });

  it('has a skip-to-content link targeting the main region', () => {
    render(<App />);
    const skipLink = screen.getByRole('link', { name: /skip to content/i });
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('sets the document title for the current route', () => {
    render(<App />);
    expect(document.title).toBe('Board · Cribbage Companion');
  });
});
