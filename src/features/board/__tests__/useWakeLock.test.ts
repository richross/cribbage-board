import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWakeLock } from '../useWakeLock';

interface MockSentinel {
  release: ReturnType<typeof vi.fn>;
}

function installMockWakeLock() {
  const release = vi.fn().mockResolvedValue(undefined);
  const sentinel: MockSentinel = { release };
  const request = vi.fn().mockResolvedValue(sentinel);
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request },
  });
  return { request, release };
}

function removeMockWakeLock() {
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useWakeLock', () => {
  afterEach(() => {
    removeMockWakeLock();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  it('requests a screen wake lock on the first user interaction while active', async () => {
    const { request } = installMockWakeLock();
    renderHook(() => useWakeLock(true));

    expect(request).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('pointerdown'));
    await flush();

    expect(request).toHaveBeenCalledWith('screen');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not request anything when inactive', async () => {
    const { request } = installMockWakeLock();
    renderHook(() => useWakeLock(false));

    window.dispatchEvent(new Event('pointerdown'));
    await flush();

    expect(request).not.toHaveBeenCalled();
  });

  it('re-requests the lock when the page becomes visible again', async () => {
    const { request } = installMockWakeLock();
    renderHook(() => useWakeLock(true));

    window.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await flush();

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('releases the sentinel on unmount', async () => {
    const { request, release } = installMockWakeLock();
    const { unmount } = renderHook(() => useWakeLock(true));

    window.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);

    unmount();
    await flush();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('degrades silently when the Wake Lock API is unsupported', async () => {
    removeMockWakeLock();
    renderHook(() => useWakeLock(true));

    expect(() => {
      window.dispatchEvent(new Event('pointerdown'));
    }).not.toThrow();
    await flush();
  });
});
