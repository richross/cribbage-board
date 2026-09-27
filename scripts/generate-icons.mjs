// One-off script to generate the app's PWA icons: a graphite peg-hole grid
// of 5 dots (matching cribbage's 5-hole groups) with one solid red peg, on
// paper-green ground. Pure Node + zlib, no image-processing dependency, so
// the mark stays consistent with the "engineering pad" world in
// src/styles/tokens.css.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function crc32(buf) {
  let c;
  const table =
    crc32.table ||
    (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) {
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        t[n] = c >>> 0;
      }
      return t;
    })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const PAPER = [238, 243, 230]; // #EEF3E6
const INK = [38, 43, 37]; // #262B25
const PENCIL_RED = [179, 38, 30]; // #B3261E

function blend(base, color, alpha) {
  return [
    Math.round(base[0] * (1 - alpha) + color[0] * alpha),
    Math.round(base[1] * (1 - alpha) + color[1] * alpha),
    Math.round(base[2] * (1 - alpha) + color[2] * alpha),
  ];
}

/**
 * Draws a row of 5 peg holes (hollow ink rings) with one solid red peg,
 * centered within a safe zone (so the mark survives maskable cropping).
 */
function pegHoleGridPng(size, { safeZoneRatio, pegIndex } = {}) {
  const safe = safeZoneRatio ?? 0.8;
  const usable = size * safe;
  const marginX = (size - usable) / 2;
  const holeCount = 5;
  const gap = usable / (holeCount + 1);
  const holeRadius = Math.max(2, usable * 0.09);
  const ringWidth = Math.max(1.5, holeRadius * 0.32);
  const centerY = size / 2;
  const activePeg = pegIndex ?? 3;

  const holes = Array.from({ length: holeCount }, (_, i) => ({
    x: marginX + gap * (i + 1),
    y: centerY,
  }));

  const rowLength = size * 3;
  const raw = Buffer.alloc((rowLength + 1) * size);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowLength + 1);
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      let color = PAPER;

      for (let i = 0; i < holes.length; i++) {
        const hole = holes[i];
        const dx = x - hole.x;
        const dy = y - hole.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (i === activePeg) {
          // Solid filled peg with a soft anti-aliased edge.
          const edge = dist - holeRadius;
          if (edge < 1) {
            const alpha = edge <= -1 ? 1 : Math.max(0, Math.min(1, (1 - edge) / 2));
            color = blend(color, PENCIL_RED, alpha);
          }
        } else {
          // Hollow ring: ink at the ring band, paper inside and outside.
          const ringInner = holeRadius - ringWidth;
          if (dist <= holeRadius + 1 && dist >= ringInner - 1) {
            const distToRing = Math.min(Math.abs(dist - holeRadius), Math.abs(dist - ringInner));
            const alpha = dist > ringInner && dist < holeRadius ? 1 : Math.max(0, 1 - distToRing);
            color = blend(color, INK, alpha);
          }
        }
      }

      const idx = rowStart + 1 + x * 3;
      raw[idx] = color[0];
      raw[idx + 1] = color[1];
      raw[idx + 2] = color[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = join(process.cwd(), 'public', 'icons');
mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, 'icon-192.png'), pegHoleGridPng(192, { safeZoneRatio: 0.86 }));
writeFileSync(join(outDir, 'icon-512.png'), pegHoleGridPng(512, { safeZoneRatio: 0.86 }));
writeFileSync(join(outDir, 'apple-touch-icon.png'), pegHoleGridPng(180, { safeZoneRatio: 0.7 }));
// Maskable icons are cropped to a centered circle by the OS; keep the mark
// inside a smaller safe zone (per the maskable.app guidance of ~80%).
writeFileSync(join(outDir, 'icon-maskable-512.png'), pegHoleGridPng(512, { safeZoneRatio: 0.6 }));

console.log('Generated peg-hole grid icons in', outDir);
