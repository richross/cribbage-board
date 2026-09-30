# Understanding the Cribbage Companion Stack (React + Vite + TypeScript)

## Big picture

This is a **single-page web application** for cribbage with three primary features:

1. A virtual cribbage board
2. A hand-scoring calculator
3. A searchable rules reference

The stack divides responsibilities like this:

| Technology | Responsibility |
|---|---|
| **React** | Builds the interface from reusable components and updates it when state changes |
| **TypeScript** | Checks types and catches mistakes before the app runs |
| **Vite** | Runs the development server, processes imports, and creates the production build |
| **React Router** | Selects which page to display based on the URL |
| **CSS Modules** | Styles individual components without class-name collisions |
| **Vitest** | Runs unit and component tests |
| **Playwright** | Tests the complete app in a real browser |
| **PWA plugin** | Makes the app installable and available offline |

A useful mental model is:

```text
Vite starts and builds the application
              ↓
React displays and updates the interface
              ↓
TypeScript checks that the code fits together correctly
```

## How the app starts

### 1. The browser loads `index.html`

The browser's initial document is `index.html` (repository root).

The two most important lines are conceptually:

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

The `root` element is initially empty. It is the location where React will place the application.

The script tag tells Vite to begin with `src/main.tsx`.

During development, Vite sees this TypeScript/JSX file, transforms it into browser-compatible JavaScript, and serves all its imported files.

### 2. React takes control

In `src/main.tsx`, this code finds the HTML element:

```tsx
const container = document.getElementById('root');
```

Then this renders the application into it:

```tsx
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`<App />` looks like an HTML tag, but it is a **React component**. Components are TypeScript functions that return JSX—the HTML-like syntax React uses to describe an interface.

`StrictMode` enables extra development-time checks. It can deliberately execute certain component logic more than once in development to expose unsafe side effects. It does not do that in the production build.

This file also imports:

- Fonts
- Global design tokens
- Global CSS

CSS imports work here because Vite understands them and includes them in the generated build.

### 3. `App` creates the shared shell and router

The top-level component is `src/app/App.tsx`.

It defines these routes:

```text
#/                  → BoardPage
#/hand              → HandPage
#/rules             → RulesPage
#/rules/:sectionId  → RulesPage for one section
anything else       → NotFoundPage
```

The app uses `HashRouter`, which is why the client-side part of the URL begins with `#`.

That is particularly useful on GitHub Pages. GitHub Pages can serve the real `/cribbage-board/` file path while React interprets everything after `#` without asking the server for another HTML file.

`App` also contains the UI shared by every page:

- Primary navigation
- Main content area
- Skip link for keyboard users
- Screen-reader announcement provider
- PWA update prompt

## How React components work

A React component is generally a function returning JSX:

```tsx
function BoardPage() {
  return <h1>Board</h1>;
}
```

React calls the function and turns its returned description into DOM elements.

When the component's **state** changes, React calls it again and updates only the affected parts of the browser DOM.

This app uses a component hierarchy resembling:

```text
App
├── Navigation
├── BoardPage
│   ├── StartScreen
│   └── GameScreen
│       ├── TitleBlock
│       ├── PegBoard
│       ├── ScoringRow
│       ├── HistoryPanel
│       └── ResultPanel
├── HandPage
│   ├── CardSlots
│   ├── CardPicker
│   └── Breakdown
├── RulesPage
└── UpdatePrompt
```

Small components are composed into larger components. For example, the reusable `Button.tsx` supports typed properties such as:

```tsx
<Button variant="secondary" size="sm" onClick={reset}>
  Reset
</Button>
```

These inputs are called **props**. Props flow from a parent component to a child component.

## A concrete example: adding four points

Following one interaction is the easiest way to understand the architecture.

Suppose the player presses **"Add 4 to Player 1."**

### 1. A visual component receives the click

`GameScreen.tsx` displays the board and passes an `onScore` callback to each scoring row:

```tsx
<ScoringRow
  trackState={trackState}
  onScore={(amount) => onScore(trackState.track.id, amount)}
/>
```

The visual component doesn't need to know how games are stored or how scoring is calculated. It reports the user's intent upward:

```text
"Add 4 points to P1"
```

This is an important React pattern: **data flows down through props, while events flow up through callbacks**.

### 2. The custom hook manages the application state

`useGame.ts` owns the React-facing board state.

A function whose name starts with `use`, such as `useGame`, is a **custom hook**. Hooks let function components use state, effects, memoization, and other React facilities.

`useGame`:

- Loads an existing game when the page starts
- Holds the current game in React state
- Handles commands such as scoring and undo
- Saves changes to `localStorage`
- Creates accessibility announcements
- Converts the event history into displayable state

Its scoring callback invokes the domain function:

```tsx
const next = domainAddScore(game, trackId, amount);
```

It then tells React about the new value:

```tsx
setGame(next);
```

Calling `setGame` causes the affected components to render again. React compares the new JSX with the previous JSX and makes the necessary DOM changes.

### 3. The domain layer enforces cribbage rules

The actual mutation is implemented in `src/domain/board/game.ts`.

It validates that:

- The player/track exists for the selected format
- The amount is an integer from 1 through 29
- The game has not already ended

It then returns a **new game value** containing an additional event:

```tsx
return {
  ...game,
  events: [...game.events, event],
};
```

Notice that it doesn't modify the existing object. This is called **immutable state** and is a central React convention. New values make changes predictable and make it easy for React to recognize that something changed.

### 4. Derived state is recalculated

The stored game is fundamentally an event ledger:

```text
Game started
P1 scored 4
P2 scored 2
Next deal
P1 scored 6
```

Another domain function derives totals, peg locations, the dealer, winner, and history from those events.

That design also makes undo simple: remove the final event and derive the state again.

### 5. The change is persisted

`useGame` saves the new game to browser storage. Reloading the page restores it.

Therefore the full path is:

```text
Button click
   ↓
ScoringRow callback
   ↓
GameScreen callback
   ↓
useGame custom hook
   ↓
Pure domain function
   ↓
New Game object
   ↓
React state update + localStorage save
   ↓
React redraws affected components
```

## Why the domain and UI are separated

The repository has two particularly important areas:

- `src/features/` contains screens and interaction logic.
- `src/domain/` contains cribbage rules and data structures.

Domain functions don't depend on React. For example, `scoreHand.ts` calculates:

- Fifteens
- Pairs
- Runs
- Flushes
- Nobs

Because that logic is independent of buttons and HTML, it can be tested easily and reused by another interface in the future.

This separation is good architecture:

```text
UI: "What should users see?"
State hook: "What is happening on this screen?"
Domain: "What is legally and mathematically correct?"
```

## The main React concepts used here

### State with `useState`

Local interactive values use `useState`:

```tsx
const [dealerPickerOpen, setDealerPickerOpen] = useState(false);
```

- `dealerPickerOpen` is the current value.
- `setDealerPickerOpen` changes it.
- A change triggers another render.

This is used for temporary UI state such as dialogs, selections, and hover state.

### More structured state with `useReducer`

The hand scorer has several related transitions: pick a card, remove a card, select a slot, switch to crib scoring, and reset.

These are handled by a reducer in `src/features/hand/state.ts`:

```tsx
dispatch({ type: 'pick', card });
dispatch({ type: 'reset' });
```

A reducer takes the current state plus an action and returns the next state:

```text
nextState = reducer(currentState, action)
```

The hook wrapping that reducer is `src/features/hand/useHandState.ts`.

A good beginner guideline is:

- Use `useState` for one or two straightforward values.
- Consider `useReducer` when many actions modify one related state object.

### Side effects with `useEffect`

A render should ideally only calculate what the UI looks like. Work that interacts with the outside world goes into `useEffect`.

Examples in this app include:

- Loading a game from storage
- Saving state to storage
- Changing the document title
- Scrolling a completed result into view
- Moving keyboard focus after navigation

Conceptually:

```tsx
useEffect(() => {
  saveSomething(value);
}, [value]);
```

The dependency array means "run this effect when `value` changes."

### Cached calculations with `useMemo`

`HandPage.tsx` computes the score when the cards or hand/crib selection changes:

```tsx
const score = useMemo(() => {
  // calculate score
}, [slots, isCrib]);
```

`useMemo` preserves the result until one of its dependencies changes.

You shouldn't use it everywhere. It is most helpful for meaningful calculations or for maintaining stable values needed by other hooks.

### DOM references with `useRef`

A ref can preserve a value without triggering renders or provide direct access to a DOM element.

This app uses refs to:

- Scroll results into view
- Focus headings
- Retain the game storage object
- Remember previous completion state

## What TypeScript contributes

TypeScript adds type information on top of JavaScript.

For example, the board's types in `src/domain/board/types.ts` include:

```tsx
export type GameFormat = 'two' | 'three' | 'teams';
export type TrackId = 'P1' | 'P2' | 'P3' | 'T1' | 'T2';
```

This prevents code from accidentally doing:

```tsx
newGame('five-player');
addScore(game, 'Player Seven', 4);
```

The compiler knows those strings aren't allowed.

Interfaces describe object shapes:

```tsx
interface Game {
  id: string;
  format: GameFormat;
  createdAt: number;
  events: GameEvent[];
}
```

Discriminated unions describe the valid event variations:

```tsx
type GameEvent =
  | ScoreEvent
  | NextDealEvent
  | SetDealerEvent;
```

After checking `event.type`, TypeScript knows which other fields are available.

This repository enables `strict` mode in `tsconfig.app.json`, so TypeScript performs fairly strong checks.

An important limitation: TypeScript checks code during development and builds, but its types don't exist at runtime. Data from storage, network calls, or users may still require runtime validation.

## What Vite contributes

Vite is not the UI framework. It is the development and build tooling.

During development, it:

- Starts a local server
- Resolves `import` statements
- Transforms TypeScript and JSX
- Processes CSS imports
- Immediately updates the browser after edits through Hot Module Replacement

For production, it:

- Type-checks through the configured build command
- Bundles modules into optimized JavaScript
- Processes and minimizes CSS
- Fingerprints assets for browser caching
- Produces the `dist/` directory

Vite's configuration (`vite.config.ts`) also adds:

- React support
- Vitest configuration
- Code-coverage configuration
- PWA manifest generation
- Offline caching

The `base: '/cribbage-board/'` setting tells Vite that production assets are served below that GitHub Pages path instead of at the domain root.

## Styling

Most components have a paired CSS Module:

```text
Button.tsx
Button.module.css
```

A component imports it like this:

```tsx
import styles from './Button.module.css';
```

And uses it like this:

```tsx
<button className={styles.button}>
```

Vite generates unique class names, preventing an ordinary `.button` rule in one file from accidentally changing an unrelated component.

Shared colors, spacing, typography, and timing are CSS custom properties in `src/styles/tokens.css`:

```css
--paper: #EEF3E6;
--space-4: 1rem;
--dur-fast: 150ms;
```

The same file changes those variables for dark mode, so components don't each need separate dark-mode implementations.

## Testing

The project has two levels of tests.

### Vitest and Testing Library

Component tests, such as `src/features/board/__tests__/BoardPage.test.tsx`, render React components in a simulated browser and interact with them much like users do:

```tsx
await user.click(
  screen.getByRole('button', { name: 'Add 4 to Player 1' }),
);

expect(screen.getByTestId('total-P1')).toHaveTextContent('4');
```

Testing by accessible role and label verifies both behavior and some accessibility assumptions.

Pure domain tests directly call scoring functions with known inputs.

### Playwright

The `e2e/` tests launch the built application in a real browser.

`playwright.config.ts` tells Playwright to:

1. Build the production app
2. Start Vite's production preview server
3. Visit the `/cribbage-board/` URL
4. Run full browser workflows

## PWA and offline behavior

The app is a Progressive Web App.

The PWA configuration in `vite.config.ts`:

- Generates an application manifest
- Supplies app icons and colors
- Creates a service worker
- Caches JavaScript, CSS, HTML, images, fonts, and rules content
- Allows the app to launch without network access
- Prompts users when a new version is available

This is why the app can be installed and used like a lightweight native application.

## Commands you will use

From the repository root:

```powershell
npm run dev
```

Starts Vite's development server. This is the normal command while coding.

```powershell
npm run typecheck
```

Checks TypeScript without producing a build.

```powershell
npm test
```

Runs unit and component tests once.

```powershell
npm run lint
```

Checks for suspicious or inconsistent code patterns.

```powershell
npm run build
```

Type-checks and produces the optimized production app.

```powershell
npm run preview
```

Serves the production build locally.

```powershell
npm run e2e
```

Builds the app and runs its Playwright browser tests.

These scripts are defined in `package.json`.

## A practical learning order

Recommended order for exploring this app:

1. **Startup:** `index.html` → `src/main.tsx`
2. **Routing:** `src/app/App.tsx`
3. **Simple component API:** `src/components/Button/Button.tsx`
4. **Conditional rendering:** `src/features/board/BoardPage.tsx`
5. **State and effects:** `src/features/board/useGame.ts`
6. **Pure business logic:** `src/domain/board/game.ts`
7. **Reducer state:** `src/features/hand/state.ts`
8. **Tests:** `src/features/board/__tests__/BoardPage.test.tsx`

When vibe coding, the biggest architectural risk is asking the model to put everything in one component. This repository demonstrates a healthier pattern:

```text
Reusable UI components
       +
Feature-specific screens and hooks
       +
Framework-independent domain logic
       +
Automated tests
```

That separation makes generated code much easier to understand, verify, and safely modify.

> **Note:** `README.md` still describes the project as an early placeholder scaffold, but the implementation has progressed considerably beyond that description.
