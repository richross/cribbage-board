import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Card } from '../../../domain/cards';
import CardPicker from './CardPicker';

function renderPicker(overrides: { isUsed?: (card: Card) => boolean } = {}) {
  const onPick = vi.fn<(card: Card) => void>();
  const onApplyText = vi.fn<(hand: Card[], starter: Card) => void>();
  render(<CardPicker isUsed={overrides.isUsed ?? (() => false)} onPick={onPick} onApplyText={onApplyText} />);
  return { onPick, onApplyText };
}

/** The 13 rank keys, in grid order, for the currently selected suit. */
function rankKeys() {
  return within(screen.getByRole('group', { name: /^Rank,/ })).getAllByRole('button');
}

describe('CardPicker keyboard navigation', () => {
  it('moves focus right and left with the arrow keys', async () => {
    const user = userEvent.setup();
    renderPicker();
    const keys = rankKeys();
    keys[0].focus();

    await user.keyboard('{ArrowRight}');
    expect(keys[1]).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(keys[0]).toHaveFocus();
  });

  it('wraps around both ends of the grid', async () => {
    const user = userEvent.setup();
    renderPicker();
    const keys = rankKeys();

    keys[0].focus();
    await user.keyboard('{ArrowLeft}');
    expect(keys[keys.length - 1]).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(keys[0]).toHaveFocus();
  });

  it('moves a full row with ArrowDown and ArrowUp', async () => {
    const user = userEvent.setup();
    renderPicker();
    const keys = rankKeys();
    keys[0].focus();

    await user.keyboard('{ArrowDown}');
    expect(keys[5]).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(keys[0]).toHaveFocus();
  });

  it('jumps to the first and last rank with Home and End', async () => {
    const user = userEvent.setup();
    renderPicker();
    const keys = rankKeys();
    keys[6].focus();

    await user.keyboard('{End}');
    expect(keys[keys.length - 1]).toHaveFocus();

    await user.keyboard('{Home}');
    expect(keys[0]).toHaveFocus();
  });

  it('leaves focus alone for keys it does not handle', async () => {
    const user = userEvent.setup();
    renderPicker();
    const keys = rankKeys();
    keys[3].focus();

    await user.keyboard('{Shift}');
    expect(keys[3]).toHaveFocus();
  });

  it('does not pick a card that is already used', async () => {
    const user = userEvent.setup();
    const props = renderPicker({ isUsed: () => true });
    await user.click(rankKeys()[0]);
    expect(props.onPick).not.toHaveBeenCalled();
  });

  it('picks the focused rank in the selected suit on click', async () => {
    const user = userEvent.setup();
    const props = renderPicker();
    await user.click(rankKeys()[4]);
    expect(props.onPick).toHaveBeenCalledWith<[Card]>({ rank: 5, suit: 'S' });
  });
});

describe('CardPicker text entry', () => {
  async function openTextEntry(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /type cards instead/i }));
  }

  it('toggles the text entry form open and closed', async () => {
    const user = userEvent.setup();
    renderPicker();
    expect(screen.queryByLabelText(/type cards/i)).not.toBeInTheDocument();

    await openTextEntry(user);
    expect(screen.getByLabelText(/type cards/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide text entry/i }));
    expect(screen.queryByLabelText(/type cards/i)).not.toBeInTheDocument();
  });

  it('ignores a submit with an empty field', async () => {
    const user = userEvent.setup();
    const props = renderPicker();
    await openTextEntry(user);
    await user.click(screen.getByRole('button', { name: /use these cards/i }));
    expect(props.onApplyText).not.toHaveBeenCalled();
  });

  it('shows an error and keeps the text when the hand cannot be parsed', async () => {
    const user = userEvent.setup();
    const props = renderPicker();
    await openTextEntry(user);
    await user.type(screen.getByLabelText(/type cards/i), 'not a hand');
    await user.click(screen.getByRole('button', { name: /use these cards/i }));

    expect(props.onApplyText).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/type cards/i)).toHaveValue('not a hand');
  });

  it('applies a valid hand, clearing the field', async () => {
    const user = userEvent.setup();
    const props = renderPicker();
    await openTextEntry(user);
    await user.type(screen.getByLabelText(/type cards/i), '5h 5c 5d jh 5s');
    await user.click(screen.getByRole('button', { name: /use these cards/i }));

    expect(props.onApplyText).toHaveBeenCalledTimes(1);
    const [hand, starter] = props.onApplyText.mock.calls[0];
    expect(hand).toHaveLength(4);
    expect(starter).toEqual({ rank: 5, suit: 'S' });
    expect(screen.getByLabelText(/type cards/i)).toHaveValue('');
  });
});
