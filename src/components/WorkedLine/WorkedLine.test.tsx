import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkedLine from './WorkedLine';

describe('WorkedLine', () => {
  it('renders the label and value', () => {
    render(<WorkedLine label="5♥ + J♠ = 15" value={2} />);
    expect(screen.getByText('5♥ + J♠ = 15')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('applies the subtotal styling hook for single-ruled subtotal rows', () => {
    const { container } = render(<WorkedLine label="Fifteens" value={8} variant="subtotal" />);
    // Class names are hashed by CSS modules; assert a variant class was applied beyond the base line class.
    const el = container.firstElementChild as HTMLElement;
    expect(el.className.split(' ').length).toBeGreaterThan(1);
  });

  it('applies the total styling hook for the double-ruled boxed grand total', () => {
    const { container } = render(<WorkedLine label="Total" value={12} variant="total" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className.split(' ').length).toBeGreaterThan(1);
  });
});
