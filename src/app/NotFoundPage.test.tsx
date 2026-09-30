import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import NotFoundPage from './NotFoundPage';

function renderNotFound() {
  render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('explains that the page does not exist', () => {
    renderNotFound();
    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeInTheDocument();
    expect(screen.getByText(/doesn’t exist/i)).toBeInTheDocument();
  });

  it('offers a way back to the board', () => {
    renderNotFound();
    expect(screen.getByRole('link', { name: /back to board/i })).toHaveAttribute('href', '/');
  });

  it('sets the document title', () => {
    renderNotFound();
    expect(document.title).toMatch(/page not found/i);
  });
});
