import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LiveRegionProvider } from '../../../components';
import SearchPanel from './SearchPanel';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

function renderPanel() {
  render(
    <LiveRegionProvider>
      <MemoryRouter>
        <SearchPanel />
      </MemoryRouter>
    </LiveRegionProvider>,
  );
  return screen.getByPlaceholderText(/Search rules/) as HTMLInputElement;
}

/** Types a query and waits for the debounced results to settle. */
async function search(user: ReturnType<typeof userEvent.setup>, field: HTMLInputElement, query: string) {
  await user.type(field, query);
  await screen.findByText(/results? for/i);
  return screen.getAllByRole('button').filter((el) => el.className.includes('result'));
}

describe('SearchPanel keyboard navigation', () => {
  it('moves focus from the field into the first result with ArrowDown', async () => {
    const user = userEvent.setup();
    const field = renderPanel();
    const results = await search(user, field, 'nobs');

    await user.keyboard('{ArrowDown}');
    expect(results[0]).toHaveFocus();
  });

  it('does nothing on ArrowDown when there are no results', async () => {
    const user = userEvent.setup();
    const field = renderPanel();
    await user.type(field, 'xyzxyzxyz');
    await screen.findByText(/No rules mention/);

    await user.keyboard('{ArrowDown}');
    expect(field).toHaveFocus();
  });

  it('walks down and back up the result list with the arrow keys', async () => {
    const user = userEvent.setup();
    const field = renderPanel();
    const results = await search(user, field, 'crib');
    expect(results.length).toBeGreaterThan(1);

    results[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(results[1]).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(results[0]).toHaveFocus();
  });

  it('returns focus to the field with ArrowUp from the first result', async () => {
    const user = userEvent.setup();
    const field = renderPanel();
    const results = await search(user, field, 'nobs');

    results[0].focus();
    await user.keyboard('{ArrowUp}');
    expect(field).toHaveFocus();
  });

  it('clamps ArrowDown at the last result', async () => {
    const user = userEvent.setup();
    const field = renderPanel();
    const results = await search(user, field, 'crib');
    const last = results[results.length - 1];

    last.focus();
    await user.keyboard('{ArrowDown}');
    expect(last).toHaveFocus();
  });

  it('clears the query with Escape from the field', async () => {
    const user = userEvent.setup();
    const field = renderPanel();
    await search(user, field, 'nobs');

    await user.keyboard('{Escape}');
    expect(field).toHaveValue('');
  });

  it('clears the query with Escape from a result, returning focus to the field', async () => {
    const user = userEvent.setup();
    const field = renderPanel();
    const results = await search(user, field, 'nobs');

    results[0].focus();
    await user.keyboard('{Escape}');
    expect(field).toHaveValue('');
    expect(field).toHaveFocus();
  });
});

describe('SearchPanel result selection', () => {
  it('navigates to the section, subheading and query when a result is chosen', async () => {
    const user = userEvent.setup();
    navigate.mockClear();
    const field = renderPanel();
    const results = await search(user, field, 'nobs');

    await user.click(results[0]);
    expect(navigate).toHaveBeenCalledTimes(1);
    const target = navigate.mock.calls[0][0] as string;
    expect(target).toMatch(/^\/rules\/[\w-]+\?h=[\w-]+&q=nobs$/);
  });
});
