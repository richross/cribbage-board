import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Board route by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Board' })).toBeInTheDocument();
  });
});
