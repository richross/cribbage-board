// One-off script to generate simple solid-color placeholder PNG icons
// for the PWA manifest, without any external image-processing dependency.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
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

// Solid background with a lighter centered square as a simple placeholder mark.
function solidPng(size, [r, g, b], [fr, fg, fb]) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowLength = size * 3;
  const raw = Buffer.alloc((rowLength + 1) * size);
  const inset = Math.round(size * 0.28);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (rowLength + 1);
    raw[rowStart] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 3;
      const inMark = x >= inset && x < size - inset && y >= inset && y < size - inset;
      if (inMark) {
        raw[idx] = fr;
        raw[idx + 1] = fg;
        raw[idx + 2] = fb;
      } else {
        raw[idx] = r;
        raw[idx + 1] = g;
        raw[idx + 2] = b;
      }
    }
  }

  const idat = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = join(process.cwd(), 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const background = [27, 31, 36]; // #1b1f24
const mark = [255, 255, 255];

writeFileSync(join(outDir, 'icon-192.png'), solidPng(192, background, mark));
writeFileSync(join(outDir, 'icon-512.png'), solidPng(512, background, mark));
writeFileSync(join(outDir, 'icon-maskable-512.png'), solidPng(512, background, mark));

console.log('Generated placeholder icons in', outDir);
