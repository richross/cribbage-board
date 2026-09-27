import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import SegmentedControl from './SegmentedControl';

function Harness() {
  const [value, setValue] = useState<'hand' | 'crib'>('hand');
  return (
    <SegmentedControl
      label="Score as"
      value={value}
      onChange={setValue}
      options={[
        { value: 'hand', label: 'Hand' },
        { value: 'crib', label: 'Crib' },
      ]}
    />
  );
}

describe('SegmentedControl', () => {
  it('exposes radiogroup semantics with one checked radio', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Score as' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Hand' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Crib' })).toHaveAttribute('aria-checked', 'false');
  });

  it('moves selection with ArrowRight and wraps with ArrowLeft from the first option', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const hand = screen.getByRole('radio', { name: 'Hand' });
    const crib = screen.getByRole('radio', { name: 'Crib' });

    hand.focus();
    await user.keyboard('{ArrowRight}');
    expect(crib).toHaveAttribute('aria-checked', 'true');
    expect(crib).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(hand).toHaveAttribute('aria-checked', 'true');
    expect(hand).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(crib).toHaveAttribute('aria-checked', 'true');
    expect(crib).toHaveFocus();
  });

  it('jumps to first/last option with Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const hand = screen.getByRole('radio', { name: 'Hand' });
    const crib = screen.getByRole('radio', { name: 'Crib' });

    hand.focus();
    await user.keyboard('{End}');
    expect(crib).toHaveFocus();
    expect(crib).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{Home}');
    expect(hand).toHaveFocus();
    expect(hand).toHaveAttribute('aria-checked', 'true');
  });
});
