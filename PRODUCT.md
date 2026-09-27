# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Casual cribbage players sitting at a real table with a physical deck of cards. A phone or tablet sits propped beside the cards, glanced at from arm's length, often with one hand free. Their jobs: keep score during a game (2 players, 3 players, or 2v2 teams), settle "what's the rule?" questions quickly, and check or learn how a hand is counted.

## Product Purpose
Cribbage Companion replaces the wooden pegboard, the rulebook, and the "wait, how many is that?" argument with one offline app. Success means players never lose their place in a game, find any rule in seconds, and understand exactly why a hand scores what it scores.

## Positioning
A table-side companion, not a card game. There's no computer opponent and no dealt cards: it supports people playing with real cards. The hand scorer teaches by itemizing every combination rather than just printing a number.

## Operating Context
- Used mid-game, in short glances, often in dim or warm living-room light and at arm's length.
- Accidental taps from hands full of cards are common; mistakes must be cheap to undo.
- Frequently offline (cabins, kitchens, travel), so everything works offline after the first load.
- The screen must stay awake while the board is open.

## Capabilities and Constraints
- Three destinations: **Board** (scoreboard), **Score Hand**, **Rules**.
- Board: a visual 121-hole peg board with leapfrogging front and back pegs; formats are 2 players, 3 players, and 2v2 (a shared track per team). One-tap start with fixed labels (Player 1/2/3, Team 1/2); no names or setup. Quick +1 to +6 buttons plus a number pad (1–29), multi-step undo, per-track history, a dealer marker (defaults to Player/Team 1, movable) with Next Deal, win lock at 121, and skunk (≤90) and double-skunk (≤60) detection. No match tracking in v1.
- Score Hand: pick 4 hand cards and 1 starter from a rank × suit grid, with a Hand/Crib toggle (flush rules differ). Itemized breakdown of every combination, grouped by category, with tap-to-highlight cards. Not linked to the Board in v1.
- Rules: original text (no copied rulebooks) based on standard American Cribbage Congress rules, split into sections with deep links and instant offline search with highlighted matches.
- Mobile-first installable PWA, hosted on GitHub Pages at `/cribbage-board/`. Local storage only; no accounts, backend, or analytics.
- Stack: Vite, React, TypeScript, Vitest, Playwright.

## Brand Commitments
- Name: "Cribbage Companion" (short: "Cribbage").
- Voice *(assumed, pending user confirmation)*: a friendly table companion. Plain and warm, it gets out of the way and teaches without lecturing. Cribbage terms (nobs, his heels, go, skunk) are used naturally and always explainable.

## Evidence on Hand
No logos, imagery, testimonials, or user data exist. Do not fabricate reviews, user counts, or endorsements. Rules text must be original writing.

## Product Principles
1. **The game is on the table, not the screen.** Glanceable, low-attention, and never demanding.
2. **Every mistake is one tap from fixed.** Undo is prominent and trustworthy; nothing destructive happens without confirmation.
3. **Show the work.** Scores are explained rather than asserted; learning comes from seeing the combinations.
4. **Zero setup.** Open and play in one tap, offline.
5. **Correct by the book.** Scoring and rules follow standard ACC rules exactly.

## Accessibility & Inclusion
WCAG 2.2 AA. Touch targets are at least 44px. Players and teams are distinguished by shape or label as well as color. The peg board has a text equivalent (totals and "N to go"). Screen-reader announcements for scoring and undo, full keyboard support, reduced-motion support, and legible at arm's length.
