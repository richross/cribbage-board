// Renderer for the test-dashboard canvas.
//
// Emits a single self-contained HTML document for the canvas iframe. No bundler,
// no dependencies: the CSS and client script are inlined here and the document
// fetches its data from the extension's own loopback endpoints (`/api/snapshot`,
// `/events`).
//
// The direction contract for this surface is embedded in the emitted markup below
// so it survives into the built document (see the HTML comment at the top of <body>).

/** Escape a value for interpolation into HTML text or an attribute. */
function esc(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const STYLES = `
/* ---------------------------------------------------------------------------
   Ground. Host theme tokens supply colour and type so the panel follows the
   app's light/dark mode; everything structural below is the computation pad.
   --------------------------------------------------------------------------- */
*, *::before, *::after { box-sizing: border-box; }

:root {
  --rule: var(--border-color-default, #d1d9e0);
  --rule-strong: var(--text-color-default, #1f2328);
  --ground: var(--background-color-default, #ffffff);
  --ink: var(--text-color-default, #1f2328);
  --ink-muted: var(--text-color-muted, #59636e);

  --pass: #1a7f37;
  --fail: #cf222e;
  --skip: #59636e;
  --warn: #8a5600;
  --link: var(--true-color-blue, #0969da);

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;

  --radius: 4px;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

[data-color-mode="dark"] {
  --pass: #3fb950;
  --fail: #ff7b72;
  --skip: #8d96a0;
  --warn: #d29922;
  --link: var(--true-color-blue, #4493f8);
}

@media (prefers-color-scheme: dark) {
  [data-color-mode="auto"] {
    --pass: #3fb950;
    --fail: #ff7b72;
    --skip: #8d96a0;
    --warn: #d29922;
    --link: var(--true-color-blue, #4493f8);
  }
}

html { scrollbar-gutter: stable; }

body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: var(--text-body-medium, 14px);
  line-height: var(--leading-body-medium, 20px);
}

/* Every counted value is tabular so digits never jitter as a run streams in. */
.num { font-variant-numeric: tabular-nums; }

code, .mono {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Consolas, monospace);
  font-size: var(--text-code-inline, 12px);
  font-variant-numeric: tabular-nums;
}

:focus-visible {
  outline: 2px solid var(--color-focus-outline, var(--link));
  outline-offset: 2px;
  border-radius: 4px;
}

/* Structural labels only. Never test names, messages or stacks. */
.label {
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

/* ---------------------------------------------------------------------------
   Title block — sticky, ruled off. Repo identity plus honest freshness state.
   --------------------------------------------------------------------------- */
.titleblock {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--ground);
  border-bottom: 1px solid var(--rule);
  padding: var(--space-3) var(--space-4);
}

.titleblock__row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.titleblock__repo {
  font-weight: var(--font-weight-semibold, 600);
  font-size: var(--text-body-medium, 14px);
}

.titleblock__sep { color: var(--ink-muted); }

.titleblock__meta {
  color: var(--ink-muted);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
}

.titleblock__actions {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

/* Freshness is stated, never hidden. */
.freshness {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-2);
  font-size: 12px;
  color: var(--ink-muted);
}
.freshness__dot {
  width: 7px; height: 7px; flex: none;
  border-radius: 50%;
  background: var(--skip);
}
.freshness[data-state="fresh"] .freshness__dot { background: var(--pass); }
.freshness[data-state="stale"] .freshness__dot { background: var(--warn); }
.freshness[data-state="never-run"] .freshness__dot { background: var(--skip); }

/* ---------------------------------------------------------------------------
   Buttons. 4px radius, 1px rule, no fills beyond the primary. No pills.
   --------------------------------------------------------------------------- */
.btn {
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-semibold, 600);
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  padding: 5px 12px;
  min-height: 28px;
  cursor: pointer;
  transition: background-color 150ms var(--ease), border-color 150ms var(--ease);
}
.btn:hover:not(:disabled) { border-color: var(--rule-strong); }
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn[aria-busy="true"] { opacity: 0.7; cursor: progress; }

/* ---------------------------------------------------------------------------
   Sections — separated by ruled lines, not cards. No card scaffold anywhere.
   --------------------------------------------------------------------------- */
.section {
  border-bottom: 1px solid var(--rule);
  padding: var(--space-4);
}
.section:last-child { border-bottom: 0; }

.section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

/* Unavailable / empty states: explicit and reasoned, never a fabricated zero. */
.notice {
  color: var(--ink-muted);
  font-size: 13px;
  padding: var(--space-3);
  border: 1px dashed var(--rule);
  border-radius: var(--radius);
}
.notice code { color: var(--ink); }

/* ---------------------------------------------------------------------------
   Verdict row. Counts, tabular, status carried by glyph + label + colour.
   Deliberately not the hero-metric template: no single anonymous big number.
   --------------------------------------------------------------------------- */
.runner { margin-bottom: var(--space-4); }
.runner:last-child { margin-bottom: 0; }

.runner__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--rule);
}
.runner__duration { font-size: 12px; color: var(--ink-muted); }

.tally {
  display: flex;
  gap: var(--space-5);
  padding-top: var(--space-3);
  flex-wrap: wrap;
}
.tally__item { display: flex; align-items: baseline; gap: var(--space-2); }
.tally__value {
  font-size: 24px;
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1;
}
.tally__item[data-kind="passed"] .tally__value { color: var(--pass); }
.tally__item[data-kind="failed"] .tally__value { color: var(--fail); }
.tally__item[data-kind="skipped"] .tally__value { color: var(--skip); }
.tally__item[data-zero="true"] .tally__value { color: var(--ink-muted); }

/* ---------------------------------------------------------------------------
   Worked lines — the signature device. Label, dotted leader, tabular value,
   ruled off into a boxed total. Coverage shown as a hand-worked sum rather
   than a ring or a bar.
   --------------------------------------------------------------------------- */
.worked { margin: 0; }

.worked__line {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) 0;
}
.worked__label { flex: none; }
.worked__leader {
  flex: 1 1 auto;
  border-bottom: 1px dotted var(--ink-muted);
  transform: translateY(-3px);
  min-width: var(--space-4);
}
.worked__value {
  flex: none;
  font-variant-numeric: tabular-nums;
  font-weight: var(--font-weight-semibold, 600);
}
.worked__fraction {
  flex: none;
  font-size: 12px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
  min-width: 7.5ch;
  text-align: right;
}

.worked__total {
  margin-top: var(--space-2);
  border-top: 3px double var(--rule-strong);
  border-bottom: 1px solid var(--rule);
  border-left: 1px solid var(--rule);
  border-right: 1px solid var(--rule);
  padding: var(--space-3) var(--space-3);
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}
.worked__total .worked__value { font-size: 20px; }

.coverage-scope {
  margin-top: var(--space-3);
  font-size: 12px;
  color: var(--ink-muted);
}

/* ---------------------------------------------------------------------------
   Tables — ruled rows, no zebra fills, no shadows.
   --------------------------------------------------------------------------- */
.table { width: 100%; border-collapse: collapse; }
.table th {
  text-align: left;
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
  padding: var(--space-2) var(--space-2);
  border-bottom: 1px solid var(--rule);
  white-space: nowrap;
}
.table th button {
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.table th button:hover { color: var(--ink); }
.table th[aria-sort] button { color: var(--ink); }
.table td {
  padding: var(--space-2) var(--space-2);
  border-bottom: 1px solid var(--rule);
  vertical-align: top;
}
.table td.num, .table th.num { text-align: right; }

.file-row { cursor: pointer; }
.file-row:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }
.file-row__path {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  word-break: break-all;
}
.file-row__dir { color: var(--ink-muted); }

/* Low coverage marked by label as well as colour. */
.cov-pct { font-variant-numeric: tabular-nums; }
.cov-pct[data-band="low"] { color: var(--fail); font-weight: var(--font-weight-semibold, 600); }
.cov-pct[data-band="mid"] { color: var(--warn); }

.band-tag {
  display: inline-block;
  margin-left: var(--space-2);
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid currentColor;
  border-radius: var(--radius);
  padding: 0 4px;
  vertical-align: 1px;
}

.uncovered {
  padding: var(--space-3);
  border-bottom: 1px solid var(--rule);
  font-size: 12px;
  color: var(--ink-muted);
}
.uncovered__lines {
  font-family: var(--font-mono, ui-monospace, monospace);
  color: var(--ink);
  word-break: break-word;
  margin-top: var(--space-1);
}

/* ---------------------------------------------------------------------------
   Filters
   --------------------------------------------------------------------------- */
.controls {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  flex-wrap: wrap;
}
.controls input[type="search"] {
  flex: 1 1 10rem;
  min-width: 0;
  font: inherit;
  font-size: 12px;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--rule);
  border-radius: var(--radius) var(--radius) 0 0;
  padding: var(--space-2);
}
.controls input[type="search"]:focus { border-bottom-color: var(--rule-strong); }

.segmented {
  display: inline-flex;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  overflow: hidden;
}
.segmented button {
  font: inherit;
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-muted);
  background: transparent;
  border: 0;
  border-right: 1px solid var(--rule);
  padding: 4px 9px;
  min-height: 26px;
  cursor: pointer;
}
.segmented button:last-child { border-right: 0; }
.segmented button[aria-pressed="true"] {
  background: var(--ink);
  color: var(--ground);
}

/* ---------------------------------------------------------------------------
   Test case list — grouped by file, failures first and open by default.
   --------------------------------------------------------------------------- */
.filegroup { border-bottom: 1px solid var(--rule); }
.filegroup:last-child { border-bottom: 0; }

.filegroup__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  font: inherit;
  text-align: left;
  color: var(--ink);
  background: none;
  border: 0;
  padding: var(--space-3) var(--space-1);
  cursor: pointer;
}
.filegroup__head:hover { background: color-mix(in srgb, var(--ink) 4%, transparent); }
.filegroup__name {
  flex: 1 1 auto;
  min-width: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  word-break: break-all;
}
.filegroup__counts {
  flex: none;
  font-size: 11px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.chevron {
  flex: none;
  width: 10px;
  color: var(--ink-muted);
  transition: transform 150ms var(--ease);
}
[aria-expanded="true"] > .chevron { transform: rotate(90deg); }

.case {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-1) var(--space-2) var(--space-5);
  border-top: 1px solid var(--rule);
}
.case__suite { color: var(--ink-muted); }
.case__name { flex: 1 1 auto; min-width: 0; word-break: break-word; }
.case__duration {
  flex: none;
  font-size: 11px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

/* Status: glyph + accessible text + colour. Never colour alone. */
.status {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1em;
  font-weight: 700;
}
.status[data-status="passed"] { color: var(--pass); }
.status[data-status="failed"] { color: var(--fail); }
.status[data-status="skipped"] { color: var(--skip); }

.failure {
  margin: 0 var(--space-1) var(--space-3) var(--space-5);
  border-left: 1px solid var(--fail);
  padding: var(--space-2) var(--space-3);
}
.failure pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  line-height: 1.5;
}
.failure__message { color: var(--fail); }
.failure__stack {
  margin-top: var(--space-2);
  color: var(--ink-muted);
}

/* ---------------------------------------------------------------------------
   Last passing commit
   --------------------------------------------------------------------------- */
.commit__subject { margin: var(--space-1) 0; word-break: break-word; }
.commit__meta { font-size: 12px; color: var(--ink-muted); }
.commit__sha {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
}
a { color: var(--link); }

/* Run log */
.runlog {
  margin-top: var(--space-3);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  padding: var(--space-2);
  max-height: 11rem;
  overflow: auto;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ink-muted);
}

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 1ms !important;
    animation-duration: 1ms !important;
  }
}
`;

const CLIENT = String.raw`
const $ = (sel) => document.querySelector(sel);
const state = {
  snapshot: null,
  runner: "all",
  statusFilter: "all",
  query: "",
  sortKey: "statements",
  sortDir: "asc",
  openFiles: new Set(),
  openCoverage: new Set(),
  running: false,
  log: [],
};

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const GLYPH = { passed: "\u2713", failed: "\u2715", skipped: "\u25CB" };
const WORD = { passed: "Passed", failed: "Failed", skipped: "Skipped" };

function fmtDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "\u2014";
  if (ms < 1000) return Math.round(ms) + "ms";
  if (ms < 60000) return (ms / 1000).toFixed(1) + "s";
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return m + "m " + s + "s";
}

function fmtRelative(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const diff = Date.now() - then;
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + (mins === 1 ? " minute ago" : " minutes ago");
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.floor(hours / 24);
  if (days < 30) return days + (days === 1 ? " day ago" : " days ago");
  return new Date(iso).toLocaleDateString();
}

function band(pct) {
  if (pct < 50) return "low";
  if (pct < 80) return "mid";
  return "high";
}

function splitPath(p) {
  const i = p.lastIndexOf("/");
  return i === -1 ? { dir: "", base: p } : { dir: p.slice(0, i + 1), base: p.slice(i + 1) };
}

/* -- title block ---------------------------------------------------------- */
function renderTitle(s) {
  const r = s.repo || {};
  const f = s.freshness || { state: "never-run" };
  const stateWord = { fresh: "Up to date", stale: "Out of date", "never-run": "Not yet run" }[f.state] || "Unknown";
  const when = fmtRelative(f.resultsGeneratedAt);

  const meta = [];
  if (r.branch) meta.push(esc(r.branch));
  if (r.headShortSha) meta.push(esc(r.headShortSha));
  if (r.dirty) meta.push(r.dirtyFileCount + " uncommitted");

  return '<div class="titleblock__row">' +
      '<span class="titleblock__repo">Test health</span>' +
      (meta.length ? '<span class="titleblock__sep">\u2014</span><span class="titleblock__meta">' + meta.join(" \u00b7 ") + "</span>" : "") +
    "</div>" +
    '<div class="freshness" data-state="' + esc(f.state) + '">' +
      '<span class="freshness__dot" aria-hidden="true"></span>' +
      "<span>" + esc(stateWord) +
        (when ? " \u00b7 ran " + esc(when) : "") +
        (f.reason ? " \u00b7 " + esc(f.reason) : "") +
      "</span>" +
    "</div>" +
    '<div class="titleblock__actions">' +
      '<button class="btn" id="btn-refresh" type="button">Refresh</button>' +
      '<button class="btn" id="btn-run" type="button"' + (state.running ? ' aria-busy="true" disabled' : "") + ">" +
        (state.running ? "Running\u2026" : "Run tests") +
      "</button>" +
    "</div>" +
    (state.log.length ? '<div class="runlog" id="runlog">' + esc(state.log.join("\n")) + "</div>" : "");
}

/* -- verdict -------------------------------------------------------------- */
function renderRunner(title, runner, note) {
  if (!runner || !runner.available) {
    return '<div class="runner">' +
      '<div class="runner__head"><span class="label">' + esc(title) + "</span></div>" +
      '<div class="notice" style="margin-top:var(--space-3)">' + esc((runner && runner.reason) || "No results available.") + "</div>" +
    "</div>";
  }
  const t = runner.totals;
  const items = [
    ["passed", "Passed", t.passed],
    ["failed", "Failed", t.failed],
    ["skipped", "Skipped", t.skipped],
  ].map(([kind, word, n]) =>
    '<div class="tally__item" data-kind="' + kind + '" data-zero="' + (n === 0) + '">' +
      '<span class="tally__value num">' + n + "</span>" +
      '<span class="label">' + word + "</span>" +
    "</div>"
  ).join("");

  return '<div class="runner">' +
    '<div class="runner__head">' +
      '<span class="label">' + esc(title) + "</span>" +
      '<span class="runner__duration num">' + t.total + " tests \u00b7 " + fmtDuration(t.durationMs) + "</span>" +
    "</div>" +
    '<div class="tally">' + items + "</div>" +
    (note ? '<div class="coverage-scope">' + esc(note) + "</div>" : "") +
  "</div>";
}

function renderVerdict(s) {
  return renderRunner("Unit &amp; component \u00b7 Vitest", s.vitest) +
         renderRunner("End to end \u00b7 Playwright", s.playwright);
}

/* -- coverage ------------------------------------------------------------- */
function workedLine(label, m) {
  return '<div class="worked__line">' +
    '<span class="worked__label">' + esc(label) + "</span>" +
    '<span class="worked__leader" aria-hidden="true"></span>' +
    '<span class="worked__fraction">' + m.covered + "/" + m.total + "</span>" +
    '<span class="worked__value cov-pct" data-band="' + band(m.pct) + '">' + m.pct.toFixed(1) + "%</span>" +
  "</div>";
}

function renderCoverage(s) {
  const c = s.coverage;
  if (!c || !c.available || !c.totals) {
    return '<div class="notice">' +
      esc((c && c.reason) || "No coverage data yet.") +
      " Run <code>npm run test:coverage</code> to generate it." +
    "</div>";
  }
  const t = c.totals;
  const overall = t.lines;

  const lines =
    workedLine("Statements", t.statements) +
    workedLine("Branches", t.branches) +
    workedLine("Functions", t.functions) +
    workedLine("Lines", t.lines);

  const total = '<div class="worked__total">' +
    '<span class="worked__label label">Overall lines</span>' +
    '<span class="worked__leader" aria-hidden="true"></span>' +
    '<span class="worked__value cov-pct num" data-band="' + band(overall.pct) + '">' + overall.pct.toFixed(1) + "%</span>" +
  "</div>";

  const sorted = c.files.slice().sort((a, b) => {
    const dir = state.sortDir === "asc" ? 1 : -1;
    if (state.sortKey === "path") return a.relPath.localeCompare(b.relPath) * dir;
    return (a[state.sortKey].pct - b[state.sortKey].pct) * dir;
  });

  const head = (key, text, cls) => {
    const active = state.sortKey === key;
    const sortAttr = active ? ' aria-sort="' + (state.sortDir === "asc" ? "ascending" : "descending") + '"' : "";
    const arrow = active ? (state.sortDir === "asc" ? " \u2191" : " \u2193") : "";
    return "<th" + (cls ? ' class="' + cls + '"' : "") + sortAttr + ">" +
      '<button type="button" data-sort="' + key + '">' + text + esc(arrow) + "</button></th>";
  };

  const rows = sorted.map((f) => {
    const open = state.openCoverage.has(f.relPath);
    const p = splitPath(f.relPath);
    const b = band(f.lines.pct);
    const tag = b === "low" ? '<span class="band-tag">Low</span>' : "";
    const main =
      '<tr class="file-row" data-cov="' + esc(f.relPath) + '" tabindex="0" role="button" aria-expanded="' + open + '">' +
        '<td class="file-row__path"><span class="file-row__dir">' + esc(p.dir) + "</span>" + esc(p.base) + "</td>" +
        '<td class="num"><span class="cov-pct" data-band="' + b + '">' + f.lines.pct.toFixed(1) + "%</span>" + tag + "</td>" +
        '<td class="num"><span class="cov-pct" data-band="' + band(f.branches.pct) + '">' + f.branches.pct.toFixed(1) + "%</span></td>" +
        '<td class="num"><span class="cov-pct" data-band="' + band(f.functions.pct) + '">' + f.functions.pct.toFixed(1) + "%</span></td>" +
      "</tr>";
    if (!open) return main;
    const un = f.uncoveredLines || [];
    const detail = '<tr><td colspan="4" class="uncovered">' +
      (un.length
        ? "Uncovered lines (" + un.length + ")<div class=\"uncovered__lines\">" + esc(summariseLines(un)) + "</div>"
        : "Fully covered.") +
      "</td></tr>";
    return main + detail;
  }).join("");

  return '<div class="worked">' + lines + total + "</div>" +
    '<div class="coverage-scope">Unit and component tests only. Playwright runs against the built bundle and contributes results, not coverage.</div>' +
    '<table class="table" style="margin-top:var(--space-4)">' +
      "<thead><tr>" +
        head("path", "File") +
        head("lines", "Lines", "num") +
        head("branches", "Branch", "num") +
        head("functions", "Func", "num") +
      "</tr></thead><tbody>" + rows + "</tbody>" +
    "</table>";
}

/* Collapse consecutive line numbers into ranges: 3,4,5,9 -> 3-5, 9 */
function summariseLines(lines) {
  const out = [];
  let start = null, prev = null;
  for (const n of lines) {
    if (start === null) { start = prev = n; continue; }
    if (n === prev + 1) { prev = n; continue; }
    out.push(start === prev ? String(start) : start + "\u2013" + prev);
    start = prev = n;
  }
  if (start !== null) out.push(start === prev ? String(start) : start + "\u2013" + prev);
  return out.join(", ");
}

/* -- test cases ----------------------------------------------------------- */
function collectCases(s) {
  const out = [];
  if (state.runner !== "playwright" && s.vitest && s.vitest.available) {
    for (const c of s.vitest.cases) out.push({ ...c, runner: "vitest" });
  }
  if (state.runner !== "vitest" && s.playwright && s.playwright.available) {
    for (const c of s.playwright.cases) out.push({ ...c, runner: "playwright" });
  }
  return out;
}

function renderCases(s) {
  let cases = collectCases(s);
  const totalAvailable = cases.length;

  if (state.statusFilter !== "all") cases = cases.filter((c) => c.status === state.statusFilter);
  const q = state.query.trim().toLowerCase();
  if (q) {
    cases = cases.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.relFile.toLowerCase().includes(q) ||
      c.suite.join(" ").toLowerCase().includes(q)
    );
  }

  const controls =
    '<div class="controls">' +
      '<div class="segmented" role="group" aria-label="Filter by status">' +
        ["all", "failed", "passed", "skipped"].map((k) =>
          '<button type="button" data-status="' + k + '" aria-pressed="' + (state.statusFilter === k) + '">' +
            (k === "all" ? "All" : WORD[k]) + "</button>"
        ).join("") +
      "</div>" +
      '<div class="segmented" role="group" aria-label="Filter by runner">' +
        ["all", "vitest", "playwright"].map((k) =>
          '<button type="button" data-runner="' + k + '" aria-pressed="' + (state.runner === k) + '">' +
            (k === "all" ? "Both" : k === "vitest" ? "Unit" : "E2E") + "</button>"
        ).join("") +
      "</div>" +
      '<input type="search" id="q" placeholder="Search test names\u2026" value="' + esc(state.query) + '" aria-label="Search test names" />' +
    "</div>";

  if (totalAvailable === 0) {
    return controls + '<div class="notice">No test results yet. Run <code>npm run test:coverage</code>, or use Run tests above.</div>';
  }
  if (cases.length === 0) {
    return controls + '<div class="notice">No tests match this filter.</div>';
  }

  // Group by file; files containing failures sort first and open by default.
  const groups = new Map();
  for (const c of cases) {
    if (!groups.has(c.relFile)) groups.set(c.relFile, []);
    groups.get(c.relFile).push(c);
  }
  const ordered = [...groups.entries()].sort((a, b) => {
    const af = a[1].some((c) => c.status === "failed") ? 0 : 1;
    const bf = b[1].some((c) => c.status === "failed") ? 0 : 1;
    return af - bf || a[0].localeCompare(b[0]);
  });

  const html = ordered.map(([file, list]) => {
    const hasFailure = list.some((c) => c.status === "failed");
    const open = state.openFiles.has(file) || (hasFailure && !state.openFiles.has("!" + file));
    const p = splitPath(file);
    const counts = ["failed", "passed", "skipped"]
      .map((k) => ({ k, n: list.filter((c) => c.status === k).length }))
      .filter((x) => x.n > 0)
      .map((x) => x.n + " " + WORD[x.k].toLowerCase())
      .join(" \u00b7 ");

    const body = open ? list.map((c) => {
      const suite = c.suite && c.suite.length ? '<span class="case__suite">' + esc(c.suite.join(" \u203a ")) + " \u203a </span>" : "";
      const row =
        '<div class="case">' +
          '<span class="status" data-status="' + c.status + '" aria-hidden="true">' + GLYPH[c.status] + "</span>" +
          '<span class="sr-only">' + WORD[c.status] + ":</span>" +
          '<span class="case__name">' + suite + esc(c.name) + "</span>" +
          '<span class="case__duration">' + fmtDuration(c.durationMs) + "</span>" +
        "</div>";
      if (c.status !== "failed" || !c.failure) return row;
      return row +
        '<div class="failure">' +
          '<pre class="failure__message">' + esc(c.failure.message) + "</pre>" +
          (c.failure.stack ? '<pre class="failure__stack">' + esc(c.failure.stack) + "</pre>" : "") +
        "</div>";
    }).join("") : "";

    return '<div class="filegroup">' +
      '<button class="filegroup__head" type="button" data-file="' + esc(file) + '" aria-expanded="' + open + '">' +
        '<span class="chevron" aria-hidden="true">\u276F</span>' +
        '<span class="filegroup__name"><span class="file-row__dir">' + esc(p.dir) + "</span>" + esc(p.base) + "</span>" +
        '<span class="filegroup__counts">' + esc(counts) + "</span>" +
      "</button>" + body +
    "</div>";
  }).join("");

  return controls + html;
}

/* -- last passing commit -------------------------------------------------- */
function renderCommit(s) {
  const c = s.lastPassingCommit;
  if (!c || !c.available) {
    return '<div class="notice">' + esc((c && c.reason) || "Unavailable.") + "</div>";
  }
  const when = fmtRelative(c.runConcludedAt || c.committedAt);
  const bits = [];
  if (c.author) bits.push(esc(c.author));
  if (when) bits.push(esc(when));
  if (c.branch) bits.push("on " + esc(c.branch));
  return '<div><span class="commit__sha">' + esc(c.shortSha || "") + "</span>" +
      (c.runUrl ? ' \u00b7 <a href="' + esc(c.runUrl) + '" target="_blank" rel="noreferrer">CI run' +
        (c.runNumber ? " #" + c.runNumber : "") + "</a>" : "") +
    "</div>" +
    '<p class="commit__subject">' + esc(c.subject || "") + "</p>" +
    '<p class="commit__meta">' + bits.join(" \u00b7 ") + "</p>";
}

/* -- shell ---------------------------------------------------------------- */
function render() {
  const s = state.snapshot;
  if (!s) {
    $("#root").innerHTML = '<div class="section"><div class="notice">Loading\u2026</div></div>';
    return;
  }
  $("#titleblock").innerHTML = renderTitle(s);
  $("#root").innerHTML =
    '<section class="section" aria-label="Results">' + renderVerdict(s) + "</section>" +
    '<section class="section" aria-label="Coverage">' +
      '<div class="section__head"><span class="label">Coverage</span></div>' + renderCoverage(s) +
    "</section>" +
    '<section class="section" aria-label="Test cases">' +
      '<div class="section__head"><span class="label">Test cases</span></div>' + renderCases(s) +
    "</section>" +
    '<section class="section" aria-label="Last passing commit">' +
      '<div class="section__head"><span class="label">Last passing commit</span></div>' + renderCommit(s) +
    "</section>";
}

/* -- events --------------------------------------------------------------- */
document.addEventListener("click", async (e) => {
  const sortBtn = e.target.closest("[data-sort]");
  if (sortBtn) {
    const key = sortBtn.dataset.sort;
    if (state.sortKey === key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    else { state.sortKey = key; state.sortDir = key === "path" ? "asc" : "asc"; }
    return render();
  }
  const statusBtn = e.target.closest("[data-status][aria-pressed]");
  if (statusBtn) { state.statusFilter = statusBtn.dataset.status; return render(); }

  const runnerBtn = e.target.closest("[data-runner]");
  if (runnerBtn) { state.runner = runnerBtn.dataset.runner; return render(); }

  const fileBtn = e.target.closest("[data-file]");
  if (fileBtn) {
    const file = fileBtn.dataset.file;
    const isOpen = fileBtn.getAttribute("aria-expanded") === "true";
    // "!file" records an explicit collapse of an auto-opened failing group.
    if (isOpen) { state.openFiles.delete(file); state.openFiles.add("!" + file); }
    else { state.openFiles.add(file); state.openFiles.delete("!" + file); }
    return render();
  }

  const covRow = e.target.closest("[data-cov]");
  if (covRow) {
    const p = covRow.dataset.cov;
    if (state.openCoverage.has(p)) state.openCoverage.delete(p);
    else state.openCoverage.add(p);
    return render();
  }

  if (e.target.closest("#btn-refresh")) return refresh();
  if (e.target.closest("#btn-run")) return runTests();
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const covRow = e.target.closest && e.target.closest("[data-cov]");
  if (covRow) { e.preventDefault(); covRow.click(); }
});

document.addEventListener("input", (e) => {
  if (e.target.id !== "q") return;
  state.query = e.target.value;
  const pos = e.target.selectionStart;
  render();
  const next = document.getElementById("q");
  if (next) { next.focus(); next.setSelectionRange(pos, pos); }
});

async function load() {
  try {
    const res = await fetch("/api/snapshot");
    state.snapshot = await res.json();
  } catch (err) {
    state.snapshot = null;
  }
  render();
}

async function refresh() {
  const btn = document.getElementById("btn-refresh");
  if (btn) btn.setAttribute("aria-busy", "true");
  await load();
}

async function runTests() {
  if (state.running) return;
  state.running = true;
  state.log = ["Running npm run test:coverage\u2026"];
  render();
  try {
    await fetch("/api/run", { method: "POST" });
  } catch (err) {
    state.log.push("Failed to start: " + err.message);
    state.running = false;
    render();
  }
}

const es = new EventSource("/events");
es.addEventListener("snapshot", (e) => {
  state.snapshot = JSON.parse(e.data);
  render();
});
es.addEventListener("log", (e) => {
  state.log.push(e.data);
  if (state.log.length > 200) state.log = state.log.slice(-200);
  render();
  const el = document.getElementById("runlog");
  if (el) el.scrollTop = el.scrollHeight;
});
es.addEventListener("run-state", (e) => {
  state.running = JSON.parse(e.data).running;
  render();
});

load();
`;

export function renderHtml() {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Test health</title>
<style>${STYLES}</style>
</head>
<body>
<!--
  DIRECTION CONTRACT
  THESIS: Test health read as a hand-worked margin calculation, not a KPI dashboard.
    Refuses the hero-metric template (big anonymous number, small label, accent strip)
    that this repo's DESIGN.md already rejects by name.
  OWN-WORLD: Host theme tokens carry ground, text and light/dark so the panel sits in
    app chrome; the Cribbage Companion computation-pad grammar carries structure —
    1px ruled lines instead of cards, dotted leader lines, tabular numerals, 4px/0
    radii, uppercase letter-spaced labels for structure only. No shadows, glass,
    gradients, pills, rings or sparklines.
  STORY: The developer sees whether the tree is green, reaches a failure's full stack
    in one scroll, learns what is uncovered, and confirms which commit CI last passed.
  FIRST VIEWPORT: Sticky title block (repo, branch, sha, honest freshness state) over
    the verdict row — passed/failed/skipped, tabular, split Vitest vs Playwright.
    Failures are never below the fold when they exist.
  FORM: Single narrow scrolling column of ruled sections, shaped directly as a local
    extension surface rather than through a concept tournament.
-->
<div class="titleblock" id="titleblock"></div>
<main id="root"></main>
<script>${CLIENT}</script>
</body>
</html>`;
}
