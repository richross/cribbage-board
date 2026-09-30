---
description: Project context and coding guidelines for the Cribbage Companion app
---

# Cribbage Companion

A mobile-first, offline-capable PWA (React + Vite + TypeScript) for playing
cribbage at a real table: a virtual pegboard scoreboard, a hand-scoring
calculator that itemizes every combination, and a searchable rules
reference. No accounts, no backend, no network dependency after first load —
see [PRODUCT.md](../../PRODUCT.md) for full product context and
[DESIGN.md](../../DESIGN.md) for the visual design system ("engineering
computation pad" aesthetic: graphite ink on green graph paper, red/blue/ochre
pencils for track identity).

## Stack

- Vite + React 18 + TypeScript (`strict` mode) + `react-router-dom` (`HashRouter`)
- Vitest + Testing Library for unit/component tests; Playwright for e2e
- `vite-plugin-pwa` for offline caching and the installable manifest
- Plain CSS Modules (no CSS-in-JS, no UI kit) driven by tokens in
  [src/styles/tokens.css](../../src/styles/tokens.css)

## Commands

Run these before considering a change complete (CI runs all of them):

```powershell
npm run typecheck   # tsc -b --noEmit
npm run lint        # eslint .
npm test            # vitest run
npm run e2e         # builds, previews, and runs Playwright (slower; use when routing/flows change)
```

Prefer the smallest relevant command first (e.g. `npx vitest run <file>`),
then widen if needed.

## Architecture — keep these layers separate

```
src/
  domain/     Pure cribbage logic: board event ledger, hand scoring, types.
              MUST NOT import React or touch the DOM/storage directly.
  features/   One folder per route (board, hand, rules). Page component +
              a `use<Thing>` hook (React state, effects, persistence,
              announcements) that calls into domain/ + presentational
              sub-components.
  components/ Small, reusable, presentation-only UI primitives (Button,
              Field, SegmentedControl, ...), re-exported from
              src/components/index.ts.
  lib/        Shared non-domain, non-UI utilities (e.g. useDocumentTitle).
  styles/     Global tokens.css (design tokens as CSS custom properties)
              and global.css.
```

- **`domain/` stays framework-free and pure.** Functions take a value,
  return a new value (immutable — see `game.ts`'s `withEvent`), and throw
  typed errors (e.g. `GameOverError`) for invalid transitions. This is what
  makes scoring/board logic exhaustively unit-testable without rendering
  anything.
- The board is modeled as an **event ledger** (`Game.events`), with a
  separate `deriveState()` that computes totals/pegs/winner from the
  events. Undo = drop the last event and re-derive. Preserve this pattern
  when extending board behavior instead of mutating totals directly.
- Feature hooks (`useGame`, `useHandState`) are the only place that calls
  `domain/` functions, updates React state via `setGame`/`dispatch`, and
  persists to `localStorage`/`sessionStorage`. Page/screen components stay
  declarative: they receive derived state and callbacks as props.
- New shared UI primitives go in `src/components/<Name>/<Name>.tsx` with a
  colocated `.module.css`, and get added to `src/components/index.ts`.

## Conventions

- Components: function components, default export from the component
  file, named exports for their prop types (see `Button.tsx`).
- Styling: one CSS Module per component (`Foo.tsx` + `Foo.module.css`),
  classes accessed via `styles.foo`. Use existing tokens from
  `tokens.css` (`--paper`, `--ink`, `--pencil-*`, `--space-*`, etc.)
  instead of hardcoding colors/spacing, and respect the light/dark
  variants already defined there.
- Types/state shape: prefer string-literal unions and discriminated
  unions (see `GameFormat`, `TrackId`, `GameEvent`) over open `string`, so
  invalid values are caught at compile time.
- Tests live next to the code they cover (`Foo.test.tsx`,
  `__tests__/Foo.test.tsx`, or `domain/**/__tests__`). Component tests use
  Testing Library and query by accessible role/label (see
  `BoardPage.test.tsx`) rather than test IDs where practical. Pure domain
  logic gets direct unit tests with concrete inputs/outputs.
- Accessibility is a product requirement, not an afterthought: WCAG 2.2
  AA, ≥44px touch targets, screen-reader announcements for scoring/undo
  (via the shared `LiveRegionProvider`/`useAnnounce`), full keyboard
  support, and `prefers-reduced-motion` handling. Don't rely on color
  alone to distinguish players/teams (shape + label already do this via
  `PegShape`/`TrackColor`).
- Rules content under `src/features/rules/content/*.md` must be original
  writing based on standard ACC rules — never copy text from an existing
  rulebook or other source.
- No backend, accounts, analytics, or fabricated user data/testimonials —
  this app is local-storage-only by design.

## Gotchas

- The app is served from a GitHub Pages subpath (`base:
  '/cribbage-board/'` in `vite.config.ts`); keep asset/route references
  relative or aware of that base, and note the app uses `HashRouter`
  (`#/...`) rather than browser history routing.
- `README.md` is stale — it still describes the app as an early
  placeholder scaffold; treat the code as the source of truth for current
  scope.