import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveRegionProvider } from '../../../components';
import { STORAGE_KEY } from '../../../domain/board';
import BoardPage from '../BoardPage';

// Interaction-heavy tests below drive many sequential userEvent clicks; give
// them headroom beyond the default 5s so they aren't flaky under load. This
// only affects this file, not the project-wide vitest config.
vi.setConfig({ testTimeout: 15000 });

/** jsdom's localStorage isn't reliably usable in this project's test runner config; back it with a plain Map. */
function installMemoryLocalStorage() {
  const data = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
}

function renderBoard() {
  return render(
    <LiveRegionProvider>
      <BoardPage />
    </LiveRegionProvider>,
  );
}

async function startGame(user: ReturnType<typeof userEvent.setup>, label: RegExp | string) {
  renderBoard();
  await user.click(screen.getByRole('button', { name: label }));
}

async function addViaPad(user: ReturnType<typeof userEvent.setup>, trackLabel: string, digits: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(`Enter a score for ${trackLabel}`) }));
  for (const digit of digits) {
    await user.click(screen.getByRole('button', { name: `Digit ${digit}` }));
  }
  await user.click(screen.getByRole('button', { name: new RegExp(`^Add ${Number.parseInt(digits, 10)}$`) }));
}

beforeEach(() => {
  installMemoryLocalStorage();
});

describe('BoardPage', () => {
  it('shows the start screen with three format buttons when there is no saved game', () => {
    renderBoard();
    expect(screen.getByRole('button', { name: /2 Players/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3 Players/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 v 2/ })).toBeInTheDocument();
  });

  it('starting 3 Players shows three tracks', async () => {
    const user = userEvent.setup();
    await startGame(user, /3 Players/);

    expect(screen.getByTestId('total-P1')).toHaveTextContent('0');
    expect(screen.getByTestId('total-P2')).toHaveTextContent('0');
    expect(screen.getByTestId('total-P3')).toHaveTextContent('0');
  });

  it('scoring +4 updates the total and to-go', async () => {
    const user = userEvent.setup();
    await startGame(user, /2 Players/);

    await user.click(screen.getByRole('button', { name: 'Add 4 to Player 1' }));

    expect(screen.getByTestId('total-P1')).toHaveTextContent('4');
    expect(screen.getByText('117 to go')).toBeInTheDocument();
  });

  describe('number pad validation', () => {
    it('rejects 0', async () => {
      const user = userEvent.setup();
      await startGame(user, /2 Players/);
      await user.click(screen.getByRole('button', { name: /Enter a score for Player 1/ }));
      await user.click(screen.getByRole('button', { name: 'Digit 0' }));
      expect(screen.getByText('Enter 1 to 29')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Add \d+$/ })).not.toBeInTheDocument();
    });

    it('rejects 30', async () => {
      const user = userEvent.setup();
      await startGame(user, /2 Players/);
      await user.click(screen.getByRole('button', { name: /Enter a score for Player 1/ }));
      await user.click(screen.getByRole('button', { name: 'Digit 3' }));
      await user.click(screen.getByRole('button', { name: 'Digit 0' }));
      expect(screen.getByText('Enter 1 to 29')).toBeInTheDocument();
    });

    it('accepts 12', async () => {
      const user = userEvent.setup();
      await startGame(user, /2 Players/);
      await addViaPad(user, 'Player 1', '12');
      expect(screen.getByTestId('total-P1')).toHaveTextContent('12');
    });
  });

  it('undo shows a descriptive label and reverts the score', async () => {
    const user = userEvent.setup();
    await startGame(user, /2 Players/);
    await user.click(screen.getByRole('button', { name: 'Add 4 to Player 1' }));

    const undoButton = screen.getByRole('button', { name: 'Undo +4 P1' });
    expect(undoButton).toBeEnabled();

    await user.click(undoButton);
    expect(screen.getByTestId('total-P1')).toHaveTextContent('0');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('next deal rotates the dealer display', async () => {
    const user = userEvent.setup();
    await startGame(user, /2 Players/);

    expect(screen.getByRole('button', { name: /Dealer.*P1/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next deal' }));
    expect(screen.getByRole('button', { name: /Dealer.*P2/ })).toBeInTheDocument();
    expect(screen.getByText('2P · Hand 2')).toBeInTheDocument();
  });

  it('the dealer chooser moves the dealer to the selected seat', async () => {
    const user = userEvent.setup();
    await startGame(user, /3 Players/);

    await user.click(screen.getByRole('button', { name: /Dealer.*P1/ }));
    const group = screen.getByRole('radiogroup', { name: 'Choose dealer' });
    await user.click(within(group).getByRole('radio', { name: 'Player 3' }));

    expect(screen.getByRole('button', { name: /Dealer.*P3/ })).toBeInTheDocument();
  });

  it('locks scoring and shows a skunk badge when a track reaches 121', async () => {
    const user = userEvent.setup();
    await startGame(user, /2 Players/);

    await addViaPad(user, 'Player 1', '29');
    await addViaPad(user, 'Player 1', '29');
    await addViaPad(user, 'Player 1', '29');
    await addViaPad(user, 'Player 1', '29');
    await user.click(screen.getByRole('button', { name: 'Add 5 to Player 1' }));

    expect(screen.getByText('Player 1 wins 121\u20130')).toBeInTheDocument();
    expect(screen.getByText('Double skunk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add 1 to Player 1' })).toBeDisabled();
  });

  it('new game requires confirmation and clears the board', async () => {
    const user = userEvent.setup();
    await startGame(user, /2 Players/);
    await user.click(screen.getByRole('button', { name: 'Add 4 to Player 1' }));

    await user.click(screen.getByRole('button', { name: 'New game' }));
    expect(screen.getByText('Start a new game? This clears the board.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('total-P1')).toHaveTextContent('4');

    await user.click(screen.getByRole('button', { name: 'New game' }));
    const confirmGroup = screen.getByRole('group', { name: /Start a new game/ });
    await user.click(within(confirmGroup).getAllByRole('button').at(-1)!);

    expect(screen.getByRole('button', { name: /2 Players/ })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores an in-progress game from storage on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = renderBoard();
    await user.click(screen.getByRole('button', { name: /2 Players/ }));
    await user.click(screen.getByRole('button', { name: 'Add 4 to Player 1' }));
    unmount();

    renderBoard();
    expect(screen.getByTestId('total-P1')).toHaveTextContent('4');
  });

  it('shows a corrupt-storage notice and the start screen when saved data is unreadable', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    renderBoard();
    expect(screen.getByText("Couldn't restore the last game.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 Players/ })).toBeInTheDocument();
  });
});
