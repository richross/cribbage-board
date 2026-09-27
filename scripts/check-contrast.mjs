// Computes WCAG 2.x contrast ratios for the design tokens that must stay
// legible: --ink-2 (secondary text) and each pencil color, against both
// --paper and --paper-raised, in the light theme and the dark "night sheet".
//
// Run with: node scripts/check-contrast.mjs

/** @param {string} hex */
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function channelToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rl = channelToLinear(r);
  const gl = channelToLinear(g);
  const bl = channelToLinear(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

const themes = {
  light: {
    paper: '#EEF3E6',
    paperRaised: '#F6F9F1',
    ink2: '#525C4C',
    pencilRed: '#B3261E',
    pencilBlue: '#1D4E9E',
    pencilOchre: '#8A5600',
  },
  dark: {
    paper: '#1B211B',
    paperRaised: '#232B22',
    ink2: '#A9B5A0',
    pencilRed: '#FF8A7A',
    pencilBlue: '#8EB4FF',
    pencilOchre: '#F0B24A',
  },
};

const MIN_RATIO = 4.5;
let allPass = true;
const rows = [];

for (const [themeName, tokens] of Object.entries(themes)) {
  const { paper, paperRaised, ...colors } = tokens;
  for (const [colorName, hex] of Object.entries(colors)) {
    for (const [surfaceName, surfaceHex] of [
      ['paper', paper],
      ['paper-raised', paperRaised],
    ]) {
      const ratio = contrastRatio(hex, surfaceHex);
      const pass = ratio >= MIN_RATIO;
      if (!pass) allPass = false;
      rows.push({ theme: themeName, token: colorName, surface: surfaceName, hex, surfaceHex, ratio, pass });
    }
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('theme', 7), pad('token', 13), pad('surface', 13), pad('color', 9), pad('on', 9), pad('ratio', 8), 'result');
for (const row of rows) {
  console.log(
    pad(row.theme, 7),
    pad(row.token, 13),
    pad(row.surface, 13),
    pad(row.hex, 9),
    pad(row.surfaceHex, 9),
    pad(row.ratio.toFixed(2) + ':1', 8),
    row.pass ? 'PASS' : 'FAIL',
  );
}

console.log('');
if (allPass) {
  console.log(`All ${rows.length} checks pass the ${MIN_RATIO}:1 minimum.`);
  process.exit(0);
} else {
  console.error(`Some checks fall below the ${MIN_RATIO}:1 minimum. Adjust token values.`);
  process.exit(1);
}
