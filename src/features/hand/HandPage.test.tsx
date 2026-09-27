import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LiveRegionProvider } from '../../components';
import HandPage from './HandPage';

function renderHandPage() {
  return render(
    <MemoryRouter>
      <LiveRegionProvider>
        <HandPage />
      </LiveRegionProvider>
    </MemoryRouter>,
  );
}

async function pick(user: ReturnType<typeof userEvent.setup>, suit: RegExp, rank: string) {
  await user.click(screen.getByRole('radio', { name: suit }));
  await user.click(screen.getByRole('button', { name: new RegExp(`^${rank} of`) }));
}

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('HandPage', () => {
  it('shows an incomplete, count-aware message before 5 cards are chosen', async () => {
    renderHandPage();
    expect(screen.getByText('Pick 5 more cards')).toBeInTheDocument();

    const user = userEvent.setup();
    await pick(user, /Spades/, '5');
    expect(screen.getByText('Pick 4 more cards')).toBeInTheDocument();
  });

  it('says "Pick the starter" once all 4 hand cards are chosen', async () => {
    renderHandPage();
    const user = userEvent.setup();
    await pick(user, /Spades/, 'A');
    await pick(user, /Spades/, '3');
    await pick(user, /Spades/, '5');
    await pick(user, /Spades/, '7');
    expect(screen.getByText('Pick the starter')).toBeInTheDocument();
  });

  it('fills all 5 cards via clicks and shows the total', async () => {
    renderHandPage();
    const user = userEvent.setup();
    await pick(user, /Spades/, 'A');
    await pick(user, /Hearts/, '4');
    await pick(user, /Diamonds/, '6');
    await pick(user, /Clubs/, '9');
    await pick(user, /Spades/, 'K');

    // The incomplete message is gone once all 5 slots are filled, replaced
    // by the boxed total line.
    expect(screen.queryByText('Pick', { exact: false })).not.toBeInTheDocument();
    expect(screen.getByText('Fifteens')).toBeInTheDocument();
  });

  it('renders the famous 29 hand with every category populated', async () => {
    renderHandPage();
    const user = userEvent.setup();
    await pick(user, /Spades/, '5');
    await pick(user, /Clubs/, '5');
    await pick(user, /Diamonds/, '5');
    await pick(user, /Hearts/, 'J');
    await pick(user, /Hearts/, '5');

    expect(screen.getByText('29')).toBeInTheDocument();
    expect(screen.getByText('The perfect hand!')).toBeInTheDocument();
    expect(screen.getByText('Fifteens')).toBeInTheDocument();
    expect(screen.getByText('Pairs')).toBeInTheDocument();
    expect(screen.getByText('Nobs')).toBeInTheDocument();
  });

  it('disables cards already used and re-enables them once their slot is cleared', async () => {
    renderHandPage();
    const user = userEvent.setup();
    await pick(user, /Spades/, '5');

    const usedKey = screen.getByRole('button', { name: /^5 of Spades, already used$/ });
    expect(usedKey).toHaveAttribute('aria-disabled', 'true');

    // Tapping the filled slot removes the card and makes it active again.
    await user.click(screen.getByRole('button', { name: /Hand 1: 5♠/ }));

    const reenabledKey = screen.getByRole('button', { name: /^5 of Spades$/ });
    expect(reenabledKey).not.toHaveAttribute('aria-disabled');
  });

  it('lets the starter be picked explicitly out of fill order', async () => {
    renderHandPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Starter: empty/ }));
    await pick(user, /Hearts/, 'Q');

    expect(screen.getByRole('button', { name: /Starter: Q♥/ })).toBeInTheDocument();
    // Fill continues at hand slot 1, since the starter was chosen out of order.
    expect(screen.getByRole('button', { name: /Hand 1: empty/ })).toHaveAttribute('aria-current', 'true');
  });

  it('changes the flush score when toggling Hand to Crib for a 4-suited hand', async () => {
    renderHandPage();
    const user = userEvent.setup();
    await pick(user, /Spades/, 'A');
    await pick(user, /Spades/, '3');
    await pick(user, /Spades/, '6');
    await pick(user, /Spades/, '9');
    await pick(user, /Hearts/, 'K');

    const flushLine = screen.getByText('Flush').parentElement as HTMLElement;
    expect(within(flushLine).getByText('4')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Crib' }));

    const flushLineAfter = screen.getByText('Flush').parentElement as HTMLElement;
    expect(within(flushLineAfter).getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Crib flushes need all five cards to match.')).toBeInTheDocument();
  });

  it('toggles aria-pressed on a combo button and highlights exactly its cards', async () => {
    renderHandPage();
    const user = userEvent.setup();
    await pick(user, /Spades/, '5');
    await pick(user, /Clubs/, '5');
    await pick(user, /Diamonds/, '5');
    await pick(user, /Hearts/, 'J');
    await pick(user, /Hearts/, '5');

    const pairButtons = screen.getAllByRole('button', { name: /pair/i });
    const firstPair = pairButtons[0];
    expect(firstPair).toHaveAttribute('aria-pressed', 'false');

    await user.click(firstPair);
    expect(firstPair).toHaveAttribute('aria-pressed', 'true');

    await user.click(firstPair);
    expect(firstPair).toHaveAttribute('aria-pressed', 'false');
  });

  it('parses "type cards" text entry and reports errors inline', async () => {
    renderHandPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Type cards instead' }));
    const input = screen.getByLabelText('Type cards');

    await user.type(input, '5h 5c 5d');
    await user.click(screen.getByRole('button', { name: 'Use these cards' }));
    expect(screen.getByText(/Enter exactly 5 cards/)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '5h 5c 5d jh 5h');
    await user.click(screen.getByRole('button', { name: 'Use these cards' }));
    expect(screen.getByText(/Duplicate card/)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, '5s 5c 5d jh 5h');
    await user.click(screen.getByRole('button', { name: 'Use these cards' }));

    expect(screen.getByText('29')).toBeInTheDocument();
  });
});
