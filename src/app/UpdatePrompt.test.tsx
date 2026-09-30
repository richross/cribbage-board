import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import UpdatePrompt from './UpdatePrompt';

const setNeedRefresh = vi.fn();
const setOfflineReady = vi.fn();
const updateServiceWorker = vi.fn();

/** Mutable state the mocked useRegisterSW hook reports back to the component. */
const swState = {
  needRefresh: false,
  offlineReady: false,
  onRegisteredSW: undefined as ((url: string, registration?: unknown) => void) | undefined,
};

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: { onRegisteredSW?: (url: string, registration?: unknown) => void }) => {
    swState.onRegisteredSW = options?.onRegisteredSW;
    return {
      needRefresh: [swState.needRefresh, setNeedRefresh],
      offlineReady: [swState.offlineReady, setOfflineReady],
      updateServiceWorker,
    };
  },
}));

describe('UpdatePrompt', () => {
  beforeEach(() => {
    swState.needRefresh = false;
    swState.offlineReady = false;
    swState.onRegisteredSW = undefined;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when there is no update and no offline news', () => {
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  describe('when a new version is ready', () => {
    beforeEach(() => {
      swState.needRefresh = true;
    });

    it('announces the update politely', () => {
      render(<UpdatePrompt />);
      const banner = screen.getByRole('status');
      expect(banner).toHaveTextContent(/a new version is ready/i);
    });

    it('reloads into the new version when Reload is pressed', async () => {
      const user = userEvent.setup();
      render(<UpdatePrompt />);
      await user.click(screen.getByRole('button', { name: /reload/i }));
      expect(updateServiceWorker).toHaveBeenCalledWith(true);
    });

    it('lets the player dismiss the banner and keep playing', async () => {
      const user = userEvent.setup();
      render(<UpdatePrompt />);
      await user.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(setNeedRefresh).toHaveBeenCalledWith(false);
      expect(updateServiceWorker).not.toHaveBeenCalled();
    });

    it('takes priority over the offline toast', () => {
      swState.offlineReady = true;
      render(<UpdatePrompt />);
      expect(screen.getByRole('status')).toHaveTextContent(/a new version is ready/i);
      expect(screen.queryByText(/ready to use offline/i)).not.toBeInTheDocument();
    });
  });

  describe('when the app becomes available offline', () => {
    beforeEach(() => {
      swState.offlineReady = true;
    });

    it('shows a toast', () => {
      render(<UpdatePrompt />);
      expect(screen.getByRole('status')).toHaveTextContent(/ready to use offline/i);
    });

    it('auto-dismisses the toast after four seconds', () => {
      vi.useFakeTimers();
      render(<UpdatePrompt />);
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(setOfflineReady).toHaveBeenCalledWith(false);
    });

    it('clears its timer on unmount without dismissing', () => {
      vi.useFakeTimers();
      const { unmount } = render(<UpdatePrompt />);
      unmount();
      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(setOfflineReady).not.toHaveBeenCalled();
    });
  });

  describe('periodic update checks', () => {
    it('polls the registration hourly so long offline sessions pick up new builds', async () => {
      vi.useFakeTimers();
      const update = vi.fn().mockResolvedValue(undefined);
      render(<UpdatePrompt />);

      swState.onRegisteredSW?.('/sw.js', { update });
      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(update).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(60 * 60 * 1000);
      expect(update).toHaveBeenCalledTimes(2);
    });

    it('ignores a missing registration', () => {
      vi.useFakeTimers();
      render(<UpdatePrompt />);
      expect(() => swState.onRegisteredSW?.('/sw.js', undefined)).not.toThrow();
    });

    it('swallows a failed update check', async () => {
      const update = vi.fn().mockRejectedValue(new Error('offline'));
      vi.useFakeTimers();
      render(<UpdatePrompt />);

      swState.onRegisteredSW?.('/sw.js', { update });
      vi.advanceTimersByTime(60 * 60 * 1000);
      vi.useRealTimers();

      await waitFor(() => expect(update).toHaveBeenCalled());
    });
  });
});
