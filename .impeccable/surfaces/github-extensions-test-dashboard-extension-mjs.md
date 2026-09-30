---
version: 1
slug: "github-extensions-test-dashboard-extension-mjs"
primary_target: ".github/extensions/test-dashboard/extension.mjs"
related_targets: []
---

## Scope

The `test-dashboard` canvas extension (`.github/extensions/test-dashboard/`) — a read-only
panel rendered inside the Copilot app that reports this repo's test health. Not part of the
shipped Cribbage Companion PWA; the audience is a developer working on the repo, not a player.

## Visitor mode

**Operate.** The developer is mid-task: they changed code, ran tests, and need to know what
broke, what is covered, and whether the tree is green. Scanability, honest state, and fast
access to a failure's stack outrank expression. The panel should disappear into the task.

## Audience and job

One developer, at a desk, in a narrow right-hand panel beside their editor, under normal
indoor office light, screen-lit. Jobs, in the order they occur:

1. "Did my change break anything?" → verdict first, failures reachable in one scroll.
2. "What exactly failed and why?" → full message and stack, not a truncated summary.
3. "What isn't covered?" → per-file coverage, drill to uncovered line numbers.
4. "Is main actually green?" → the last commit where CI passed.

## Action / task

No destructive actions. Two affordances only: re-read artifacts from disk (`refresh`), and
run the suite (`run_tests`). Everything else is reading and filtering.

## Proof / content

Real artifacts only: `coverage/coverage-summary.json`, `coverage/coverage-final.json`,
`.test-results/vitest.json`, `.test-results/playwright.json`, local `git`, and `gh run list`
for the last green `CI` run on `main`. Nineteen Vitest files and four Playwright specs.

**Nothing is fabricated.** Every section degrades to an explicit, labelled unavailable state
with a reason. A missing coverage file reads "run npm run test:coverage", never `0%`. An
absent or unauthenticated `gh` reads as unavailable, never as local HEAD dressed up as verified.

## Constraints

- Renders in an isolated iframe document with no app stylesheet and no component library.
- Must follow the host's light/dark theme tokens (`data-color-mode` flips underneath it).
- Panel is narrow and tall; the composition must survive ~360px width.
- No npm dependencies — Node built-ins and hand-written CSS/JS only.
- Long failure stacks and long file paths are the normal case, not the edge case.

## Chosen direction

**Hybrid: the computation pad, rendered in app chrome.** The Copilot app's theme tokens supply
ground, text, and type so the panel sits natively in the surrounding UI and follows light/dark.
The Cribbage Companion structural grammar from `DESIGN.md` supplies everything else:

- Separation by 1px ruled lines, never by card shadows. No cards-as-scaffold, no nested cards.
- Coverage read as **worked leader-dot lines** — label, dotted leader, right-aligned tabular
  value — culminating in a double-ruled, boxed total. The same device the hand scorer uses to
  show its work, now showing coverage's work.
- `font-variant-numeric: tabular-nums` on every counted value, so digits never jitter while
  a run streams in.
- Uppercase, letter-spaced labels for structure only; never for test names, messages, or stacks.
- Radii of 4px and 0 only. No pills, no glass, no gradients, no glows, no progress rings,
  no sparklines.
- Monospace is reserved for what is genuinely code or measurement: file paths, test names,
  stack traces, line numbers.

Explicitly refused: the hero-metric dashboard (big anonymous number, small label, accent strip),
which is both the category default and the arrangement `DESIGN.md` already rejects by name.

## Memorable moment

**Coverage that shows its work.** Instead of a percentage ring, coverage totals resolve as a
hand-worked sum — statements, branches, functions, lines each on a dotted leader line, ruled
off into a boxed total. It reads as a margin calculation rather than a KPI tile, and it is the
one place the panel is unmistakably this repo's and not any dashboard's.

## First viewport

Sticky title block: repo, branch, short sha, and a freshness state that says plainly whether
results predate the current working tree. Immediately below, the verdict row — passed / failed /
skipped split Vitest vs Playwright, tabular, with failures stated first when any exist. Failures
are never below the fold when they exist.

## States

Every section ships: loaded, empty/never-run, unavailable-with-reason, stale, and running.
Status is carried by a glyph and a text label as well as colour — the Never-Color-Alone rule
from `DESIGN.md`, applied to test status instead of player identity. Focus rings visible,
filters and sorting keyboard-operable, `prefers-reduced-motion` respected.

## Recorded deviations

- The mechanical detector flags 22 literal `font-size` values (10/11/12/20/24px) and previously a
  `2px` focus radius against the `DESIGN.md` type ramp and rounded scale. The radius is now `4px`
  and conforms. The type sizes are a **deliberate deviation**: this surface renders inside the
  Copilot app chrome, not the Cribbage app, so it sizes against host theme tokens
  (`--text-body-medium`, `--text-code-inline`) with literal fallbacks, per the agreed hybrid
  direction. `DESIGN.md`'s ramp governs the game UI and is not the authority here.

## Unresolved

- Whether `run_tests` should also offer the Playwright suite. It is slow (production build plus
  browser) and may be better left to an explicit opt-in than run by default.
- Coverage reflects unit/component tests only; Playwright contributes results but no coverage.
  The UI must state this rather than imply full-stack coverage.
