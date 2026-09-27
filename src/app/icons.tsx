import type { SVGProps } from 'react';

const shared: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/** Peg board: a row of holes with one peg, standing in for the scoreboard. */
export function BoardIcon() {
  return (
    <svg {...shared}>
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <circle cx="7.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" />
      <circle cx="16.5" cy="12" r="1.1" />
    </svg>
  );
}

/** A playing card with a plus, standing in for scoring a hand. */
export function HandIcon() {
  return (
    <svg {...shared}>
      <rect x="5" y="3" width="12" height="16" rx="1.5" />
      <path d="M9 9h4M11 7v4" />
      <path d="M17 15l3 3M20 15l-3 3" />
    </svg>
  );
}

/** An open book, standing in for the rules reference. */
export function RulesIcon() {
  return (
    <svg {...shared}>
      <path d="M12 6.5c-1.4-1-3.4-1.5-5.5-1.5-1 0-2 .1-2.5.3v12c.5-.2 1.5-.3 2.5-.3 2.1 0 4.1.5 5.5 1.5" />
      <path d="M12 6.5c1.4-1 3.4-1.5 5.5-1.5 1 0 2 .1 2.5.3v12c-.5-.2-1.5-.3-2.5-.3-2.1 0-4.1.5-5.5 1.5V6.5Z" />
    </svg>
  );
}
