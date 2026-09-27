import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { LiveRegionProvider, useAnnounce } from './LiveRegion';

function Announcer({ message }: { message: string }) {
  const announce = useAnnounce();
  return (
    <button type="button" onClick={() => announce(message)}>
      Announce
    </button>
  );
}

describe('LiveRegion', () => {
  it('renders a polite aria-live region that receives announced text', async () => {
    render(
      <LiveRegionProvider>
        <Announcer message="15 for 2" />
      </LiveRegionProvider>,
    );

    const button = screen.getByRole('button', { name: 'Announce' });
    await act(async () => {
      button.click();
    });

    expect(screen.getByText(/15 for 2/)).toBeInTheDocument();
  });

  it('throws if useAnnounce is used outside the provider', () => {
    function Bare() {
      useAnnounce();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/LiveRegionProvider/);
  });
});
