---
name: Cribbage Companion
description: An engineer's computation pad kept beside the cards — pencil-worked scoring on ruled green paper.
colors:
  paper: "#EEF3E6"
  paper-raised: "#F6F9F1"
  grid-minor: "#D3E0C8"
  grid-major: "#B3C9A4"
  ink: "#262B25"
  ink-2: "#525C4C"
  pencil-red: "#B3261E"
  pencil-blue: "#1D4E9E"
  pencil-ochre: "#8A5600"
  eraser: "#E7B7B0"
typography:
  label:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  total:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  none: "0"
  sm: "4px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  7: "1.75rem"
  8: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "8px 20px"
  button-primary-hover:
    backgroundColor: "{colors.ink-2}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  button-destructive:
    backgroundColor: "transparent"
    textColor: "{colors.pencil-red}"
    rounded: "{rounded.sm}"
  key:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
    height: "48px"
    width: "48px"
  field-input:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "4px 4px 0 0"
    padding: "8px 4px"
---

# Design System: Cribbage Companion

## Overview

**Creative North Star: "The Engineering Computation Pad"**

The app is a sheet of pale-green engineering graph paper propped beside a real deck of cards, with graphite ink and colored pencils doing the work. It refuses two things by name: the fake-wood pegboard skeuomorph and the flat dashboard of big anonymous numbers. Every score is shown worked, not just stated — leader-dot lines add up to a double-ruled, boxed total, the way a hand check gets scribbled in a margin.

The palette stays restrained: paper and graphite carry nearly everything, and the three pencil colors (red, blue, ochre) are reserved for track identity and state, never used as general decoration. Depth comes from ruled lines and a pressed-paper key tab, never from shadows, glass, or gradients. The one authored motion is the peg itself stepping hole-by-hole to its new position, with an eraser-pink smudge marking an undo.

**Key Characteristics:**
- Pale green 5-square engineering grid as the page ground, replaced by plain paper on reading surfaces.
- Graphite ink for structure and text; three pencil colors reserved for player/team track identity.
- Uppercase, letter-spaced Barlow Semi Condensed "engineering lettering" for labels only, never body copy.
- Tabular numerals everywhere a value is counted.
- Worked-line leader-dot breakdowns culminating in a double-ruled, boxed grand total.
- Flat, ruled-line depth: no shadows, no glass, no gradients, no pill shapes.

## Colors

Paper and graphite dominate; pencil color is a deliberately scarce signal reserved for track identity, focus, and error/destructive state.

### Primary
- **Graphite Ink** (`#262B25`): primary text, strokes, and the fill of primary buttons/active states. The one color that reads as "structure."

### Secondary
- **Pencil Blue** (`#1D4E9E`): Player 2 / Team 2 track identity, the universal focus ring (2px, 2px offset), links, and the active margin-tab rule in Rules.
- **Pencil Red** (`#B3261E`): Player 1 / Team 1 track identity, skunk-line dashes at the 90/60 holes, destructive actions, and error text/borders.
- **Pencil Ochre** (`#8A5600`): Player 3 track identity only (3-player format).

### Neutral
- **Paper** (`#EEF3E6`): the base ground for the whole app; also the text color on filled-ink primary buttons.
- **Paper Raised** (`#F6F9F1`): keys, fields, bottom nav/rail, and any "raised" surface — the app's only elevation cue besides ruled lines.
- **Grid Minor** (`#D3E0C8`): the 8px minor grid line (`--grid-line-minor` desaturates it further for the background pattern specifically).
- **Grid Major** (`#B3C9A4`): the 40px major grid line, and the default 1px border on keys, panels, title blocks, and dividers.
- **Ink-2** (`#525C4C`): secondary/muted text (labels, "N to go", disabled states) — verified ≥4.5:1 on paper.
- **Eraser** (`#E7B7B0`): the undo feedback smudge only; not used anywhere else.

### Named Rules
**The Pencil Scarcity Rule.** The three track pencil colors (red, blue, ochre) are assigned only to player/team identity, the skunk line, focus, and error/destructive state — never to arbitrary UI decoration. If a new element needs color to stand out, ink and ink-2 are tried first.

**The Never-Color-Alone Rule.** Track identity is never carried by color by itself: a shape (`PegShape`: circle/square/triangle) and a text label (P1/T1, P2/T2, P3) always travel with the color. This is a built accessibility guarantee, not a stylistic option.

## Typography

**Body Font:** Barlow (400/500/600/700), self-hosted via `@fontsource/barlow`.
**Label Font:** Barlow Semi Condensed (500/600), self-hosted via `@fontsource/barlow-semi-condensed`.

**Character:** A workhorse engineering-drafting pairing — Barlow carries numbers and reading text plainly, while Barlow Semi Condensed is reserved for uppercase, letter-spaced "stencil lettering" labels that never appear in body copy.

### Hierarchy
- **Total** (700, 2.5rem, line-height 1): the large per-track score total in the scoring row; the single biggest number on any screen.
- **Large numeral** (400/700, 2rem `--font-size-xxl`): number-pad display and similarly prominent counted values.
- **Title** (600, 1.5rem `--font-size-lg`): the worked-line grand total's value, card ranks.
- **Subtitle** (600, 1.25rem `--font-size-md`): key labels, card suit glyphs, section headings.
- **Body** (400, 1.0625rem `--font-size-body` = 17px, line-height 1.5): running text in Rules, field input, at up to 68ch max width.
- **Label** (Barlow Semi Condensed 600, 0.9375rem/0.8125rem, uppercase, letter-spacing 0.06em): engineering-lettering labels — nav items, title-block cells, rail wordmark, margin index links. Never used for body copy.
- **Small/caption** (400, 0.8125rem `--font-size-xs`): helper text, "to go" counters, error text, chip labels.

All counted values (`.tabular-nums`, and every score/total/key/field) use `font-variant-numeric: tabular-nums` so digits never jitter in width.

### Named Rules
**The Lettering-Is-Labels-Only Rule.** Uppercase, letter-spaced Barlow Semi Condensed is a labeling device (nav, title block, margin index) — it never sets body or reading copy, which stays in plain-case Barlow.

## Layout

Mobile-first at a 360px minimum, built around a fixed bottom nav (3 destinations: Board, Score Hand, Rules) that becomes a 192px-wide sticky left rail at ≥900px, with the app shell switching from column to row flex. The main content column caps at `72rem` and centers.

- **Board**: peg tracks stack vertically full-width on mobile; at ≥900px the board and a history column split roughly 2/3–1/3 (not yet observed as an exact grid split in code beyond the shared 900px breakpoint).
- **Score Hand**: the rank/suit picker uses a CSS grid of `repeat(auto-fill, minmax(56px, 1fr))`, snapping to a fixed 7-column grid (`repeat(7, minmax(44px, 1fr))`, capped at `36rem`) once ≥380px allows 7 keys to clear the 44px touch target — the "7 + 6" rank-row layout from the direction contract.
- **Rules**: a single reading column, `max-width: 68ch`. At ≥900px the layout becomes a CSS grid (`220px minmax(0, 1fr)`) adding a sticky margin-index rail of section links on the left.
- **Spacing rhythm**: an 8-value rem scale (`--space-1` 0.25rem through `--space-8` 2rem, plus `--space-9`/`--space-10`), used consistently for gaps and padding rather than one-off pixel values.
- **Safe areas**: `env(safe-area-inset-*)` is applied to the nav/rail and main padding on all four sides.

## Elevation & Depth

Flat by construction: no `box-shadow` blur/spread is used anywhere in the component or feature stylesheets for ambient depth. The only shadow-shaped value is `box-shadow: 0 1px 0 var(--grid-major)` on `Key`, a hairline "pressed paper tab" rather than a lifted card — it disappears entirely on press (`box-shadow: none` plus `translateY(1px)`). All other separation comes from 1px `--grid-major` rules between rows, panels, and the strip-style `TitleBlock`/`ConfirmInline`/`NumberPad` containers.

### Shadow Vocabulary
- **Pressed-paper tab** (`box-shadow: 0 1px 0 var(--grid-major)`): the resting state of every `Key`; removed on `:active`/pressed to simulate the key sinking into the paper.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest; the only depth cue is a hairline bottom rule on keys, which is removed (not deepened) on press. No glass, glow, gradient, or lifted-card shadow appears anywhere in the built system.

## Shapes

Two radii only: `4px` (`--radius-sm`) on keys, fields, buttons, and small containers, and `0` (`--radius-none`) on ruled sheet-style containers like `TitleBlock` and the peg-board SVG frame. There are no pill shapes and no fully-rounded containers; the largest rounding observed anywhere is the 4px key/button radius. Borders are consistently 1px `--grid-major` (or `--ink` for stronger structural elements like `SegmentedControl` and the worked-line grand total's boxed border, which uses a top `3px double var(--ink)` rule for the double-underline effect). Peg shapes (`PegShape`) are drawn as raw SVG primitives — circle, square, triangle — solid-filled for the front peg and stroke-only (hollow) for the back peg, at a 2px stroke width.

## Components

### Buttons
- **Shape:** 4px radius (`--radius-sm`), 1px border (transparent unless outlined), min-height 44px (52px for `lg`).
- **Primary:** filled ink background (`#262B25`) with paper text; hover shifts to ink-2 (`#525C4C`).
- **Secondary:** transparent fill, 1px ink outline, ink text; hover fills paper-raised.
- **Destructive:** transparent fill, 1px pencil-red outline and text; hover fills paper-raised.
- **Ghost:** no border, ink text only, for low-emphasis inline actions; hover fills paper-raised.
- **Press:** `translateY(1px)` on active (shared with `Key`); disabled drops to 0.45 opacity with `not-allowed` cursor.

### Keys (Signature Component)
The primary touch surface for scoring: `+1`..`+6`, rank keys, and the number pad. 48×48px minimum, paper-raised fill, 1px `--grid-major` border, hairline bottom shadow that vanishes on press (`translateY(1px)`, `box-shadow: none`). A `::before` 2px top rule renders in `--track-color` (set per-instance) when a key is scoped to a specific player/team track — a thin colored "leader line" tying the key back to its pencil color without recoloring the whole key.

### Fields
- **Style:** underline-only — no border box, just a 1px `--ink` bottom rule on a paper-raised fill, radius rounded only at the top (`4px 4px 0 0`), label in `--ink-2` caption size above the field.
- **Error:** the bottom rule and helper text switch to pencil-red.
- **Disabled:** 0.45 opacity.

### Cards / Containers
- **Corner Style:** 4px (small containers) or 0 (ruled sheet strips like `TitleBlock`).
- **Background:** paper-raised.
- **Shadow Strategy:** none; separation is a 1px `--grid-major` border/divider (see Elevation & Depth).
- **Border:** 1px `--grid-major` (or `--ink` for `SegmentedControl`/worked totals).
- **Internal Padding:** `--space-3`–`--space-4` typical.

### Worked Line
The signature scoring-explanation component: a label, a dotted leader (`border-bottom: 1px dotted var(--ink-2)`) filling the remaining width, and a right-aligned tabular value — literally reproducing a hand-worked math line. Category subtotals get a single 1px top rule; the grand total gets a `3px double var(--ink)` top rule plus a full 1px box border and paper-raised fill, at a larger type size — the "double-ruled and boxed" result the direction contract calls for.

### Peg Board
The SVG track surface: hollow-stroke holes (`--ink-2`, 1.8px) with every-5th and endpoint holes rendered heavier (`--ink`, 2.2px, filled paper). Skunk lines at 90/60 render as dashed pencil-red strokes (`stroke-dasharray: 5 3`) overlaid on an absolutely-positioned HTML layer so pegs, lane labels, and hole-number marks render at real CSS pixel size independent of the SVG viewBox. Undo renders a circular eraser-pink "smudge" (`--eraser`, 200ms linear fade) at the peg's prior position; peg advancement itself is driven by CSS transform transitions using `--ease-out-expo` rather than a JS-stepped animation loop, honoring `prefers-reduced-motion` by collapsing durations to ~1ms.

### Navigation
Bottom nav (mobile) / left rail (≥900px), 3 items, uppercase Barlow Semi Condensed labels with 1.5px-stroke line icons. Active item gets a 2px ink underline bar (bottom nav) or a 3px left rule (rail), not a background fill or color-only change.

### Segmented Control
A bordered strip (1px `--ink`) of equal-width options with internal dividers; the selected option inverts to filled ink background with paper text — used for the Hand/Crib toggle.

## Do's and Don'ts

### Do:
- **Do** reserve pencil-red, pencil-blue, and pencil-ochre exclusively for track identity, focus, skunk lines, and error/destructive state.
- **Do** pair every track color with a distinct `PegShape` (circle/square/triangle) and a text label — never rely on color alone.
- **Do** use `font-variant-numeric: tabular-nums` on every counted or scored value.
- **Do** build depth with 1px `--grid-major`/`--ink` rules and the pressed-key hairline shadow, never with blurred shadows.
- **Do** drop the background grid (`.sheet--plain`) on dense reading surfaces like Rules.

### Don't:
- **Don't** use uppercase Barlow Semi Condensed lettering for body or reading copy — labels only.
- **Don't** introduce pill-shaped (fully rounded) buttons, keys, or containers; 4px and 0 are the only radii in the built system.
- **Don't** add ambient lifted-card shadows, glass, glows, or gradient text/fills anywhere in the UI.
- **Don't** animate the peg advance or eraser smudge without respecting `prefers-reduced-motion`; both are already built to collapse to near-instant.
