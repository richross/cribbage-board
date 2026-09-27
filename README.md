# Cribbage Companion

A mobile-first, offline-capable PWA for playing cribbage: track score on a
virtual **Board**, **Score a Hand**, and look up the **Rules** — all without
a network connection. Deployed to GitHub Pages at `/cribbage-board/`.

This is an early scaffold: routing, tooling, and placeholder screens only.
Feature UI and visual design come in a later phase.

## Stack

- Vite + React 18 + TypeScript (strict)
- react-router-dom (`HashRouter`) for `#/`, `#/hand`, `#/rules`, `#/rules/:sectionId`
- vite-plugin-pwa (offline caching + installable manifest)
- Vitest + Testing Library for unit/component tests
- Playwright for end-to-end tests
- ESLint (flat config) with typescript-eslint, react-hooks, react-refresh

## Scripts

| Script              | Purpose                                             |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server                            |
| `npm run build`      | Type-check (`tsc -b`) and build for production        |
| `npm run preview`    | Preview the production build locally                 |
| `npm test`           | Run unit/component tests once                        |
| `npm run test:watch` | Run unit/component tests in watch mode                |
| `npm run typecheck`  | Type-check without emitting                           |
| `npm run lint`       | Run ESLint                                            |
| `npm run e2e`        | Run Playwright end-to-end tests (builds + previews)   |

## Project structure

```
src/
  app/        App shell, routing
  features/
    board/    Scoreboard destination
    hand/     Hand scoring destination
    rules/    Rules reference destination
  domain/     Pure cribbage logic (scoring, rules content) — TBD
  lib/        Shared non-domain utilities — TBD
  styles/     Global styles
e2e/          Playwright end-to-end tests
```
