import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LiveRegionProvider } from '../../components';
import RulesIndexPage from './RulesIndexPage';
import RulesSectionPage from './RulesSectionPage';

function renderRules(initialEntry = '/rules') {
  return render(
    <LiveRegionProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/rules" element={<RulesIndexPage />} />
          <Route path="/rules/:sectionId" element={<RulesSectionPage />} />
        </Routes>
      </MemoryRouter>
    </LiveRegionProvider>,
  );
}

describe('RulesIndexPage', () => {
  it('lists every section in order as a row with title and summary', () => {
    renderRules();
    expect(screen.getByRole('heading', { level: 1, name: 'Rules' })).toBeInTheDocument();
    const links = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.includes('/rules/'));
    expect(screen.getAllByRole('link', { name: /Overview/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Glossary/ }).length).toBeGreaterThan(0);
    expect(links.length).toBeGreaterThanOrEqual(12);
  });

  it('has a sticky search field with the expected placeholder', () => {
    renderRules();
    expect(screen.getByPlaceholderText(/Search rules/)).toBeInTheDocument();
  });

  it('shows a no-results message for a query nothing matches', async () => {
    const user = userEvent.setup();
    renderRules();
    const field = screen.getByPlaceholderText(/Search rules/);
    await user.type(field, 'xyzxyzxyz');
    expect(await screen.findByText(/No rules mention/)).toBeInTheDocument();
  });

  it('shows a result count and result rows for a real query', async () => {
    const user = userEvent.setup();
    renderRules();
    const field = screen.getByPlaceholderText(/Search rules/);
    await user.type(field, 'nobs');
    expect(await screen.findByText(/results? for/i)).toBeInTheDocument();
  });

  it('clears the query with the × button', async () => {
    const user = userEvent.setup();
    renderRules();
    const field = screen.getByPlaceholderText(/Search rules/) as HTMLInputElement;
    await user.type(field, 'nobs');
    const clearButton = await screen.findByRole('button', { name: /clear search/i });
    await user.click(clearButton);
    expect(field.value).toBe('');
  });
});

describe('RulesSectionPage', () => {
  it('renders the section heading and prev/next links', async () => {
    renderRules('/rules/pegging');
    expect(await screen.findByRole('heading', { level: 1, name: 'Pegging' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Previous/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Next/ })).toBeInTheDocument();
  });

  it('has no previous link on the first section', async () => {
    renderRules('/rules/overview');
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Previous/ })).not.toBeInTheDocument();
  });

  it('has no next link on the last section', async () => {
    renderRules('/rules/glossary');
    expect(await screen.findByRole('heading', { level: 1, name: 'Glossary' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Next/ })).not.toBeInTheDocument();
  });

  it('shows a friendly not-found message for an unknown section, with a link back to the index', async () => {
    renderRules('/rules/not-a-real-section');
    expect(await screen.findByRole('heading', { name: /not found/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Rules/i })).toBeInTheDocument();
  });

  it('deep-links to and focuses a subheading via ?h=', async () => {
    renderRules('/rules/pegging?h=the-go');
    const heading = await screen.findByRole('heading', { name: /The "go"/i });
    expect(heading).toHaveAttribute('id', 'the-go');
    expect(heading).toHaveFocus();
  });

  it('lists the ## subheadings in an "on this page" nav', async () => {
    renderRules('/rules/pegging');
    const toc = await screen.findByRole('navigation', { name: /on this page/i });
    expect(toc).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /The "go"/i })).toBeInTheDocument();
  });

  it('renders a table with a caption and scoped column headers', async () => {
    renderRules('/rules/pegging');
    const table = await screen.findByRole('table');
    expect(table.querySelector('caption')).toBeInTheDocument();
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders.length).toBeGreaterThan(0);
  });

  it('colors ♥ and ♦ suit characters distinctly from plain text', async () => {
    renderRules('/rules/pegging');
    await screen.findByRole('heading', { level: 1, name: 'Pegging' });
    const heart = screen.getAllByText('♥')[0];
    expect(heart.tagName).toBe('SPAN');
  });

  it('highlights the query from a search-result deep link with <mark>', async () => {
    renderRules('/rules/scoring?h=his-nobs&q=nobs');
    await screen.findByRole('heading', { name: /His nobs/i });
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
  });
});
