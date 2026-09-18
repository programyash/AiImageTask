/**
 * Generates build/icon.png and build/icon.ico - the application icon used by
 * electron-builder for the Windows executable, installer and shortcuts.
 *
 * Written as a tiny generator rather than a checked-in binary blob so the
 * artwork is reviewable and reproducible. It has no dependencies: the PNG is
 * encoded by hand with Node's built-in zlib, and the ICO is a standard
 * PNG-in-ICO container.
 *
 * Run with `npm run icon` (only needed if you change the artwork).
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { projectRoot } from './esbuild.config.mjs';

const SIZE = 512;
const SUPERSAMPLE = 3; // 3x3 samples per pixel for antialiased edges

// --- drawing helpers -------------------------------------------------------

/** Signed distance to a rounded rectangle centred in the canvas. */
function roundedRectCoverage(x, y, halfW, halfH, radius) {
  const dx = Math.abs(x - SIZE / 2) - (halfW - radius);
  const dy = Math.abs(y - SIZE / 2) - (halfH - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  const outside = Math.hypot(ax, ay) + Math.min(Math.max(dx, dy), 0) - radius;
  return outside <= 0;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Colour of one sample point, as [r, g, b, a] with 0-255 components.
 * The design is a rounded deep-green square (matching the app's sidebar and
 * primary accent) holding a white camera-lens ring with a solid centre, plus
 * viewfinder corner ticks.
 */
function sampleColor(x, y) {
  if (!roundedRectCoverage(x, y, SIZE / 2, SIZE / 2, 112)) return [0, 0, 0, 0];

  // Vertical gradient background: brand green #2D7A63 -> #0B4A3A
  const t = y / SIZE;
  let r = lerp(0x2d, 0x0b, t);
  let g = lerp(0x7a, 0x4a, t);
  let b = lerp(0x63, 0x3a, t);

  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const dist = Math.hypot(x - cx, y - cy);

  // Lens ring
  const ringOuter = 152;
  const ringInner = 124;
  const inRing = dist <= ringOuter && dist >= ringInner;

  // Solid lens centre
  const inCore = dist <= 66;

  // Viewfinder corner ticks
  const margin = 74;
  const tickLength = 62;
  const tickWidth = 22;
  const nx = x < cx ? x : SIZE - x;
  const ny = y < cy ? y : SIZE - y;
  const inTick =
    (nx >= margin && nx <= margin + tickWidth && ny >= margin && ny <= margin + tickLength) ||
    (ny >= margin && ny <= margin + tickWidth && nx >= margin && nx <= margin + tickLength);

  if (inRing || inCore || inTick) {
    r = 0xf7;
    g = 0xf8;
    b = 0xf5;
  }

  return [r, g, b, 255];
}

/** Renders the icon to a raw RGBA buffer with supersampled antialiasing. */
function renderRgba() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  const step = 1 / SUPERSAMPLE;
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const [sr, sg, sb, sa] = sampleColor(
            x + (sx + 0.5) * step,
            y + (sy + 0.5) * step,
          );
          const alpha = sa / 255;
          r += sr * alpha;
          g += sg * alpha;
          b += sb * alpha;
          a += sa;
        }
      }

      const alphaAvg = a / samples;
      const weight = alphaAvg > 0 ? a / 255 : 1;
      const offset = (y * SIZE + x) * 4;
      pixels[offset] = Math.round(r / weight);
      pixels[offset + 1] = Math.round(g / weight);
      pixels[offset + 2] = Math.round(b / weight);
      pixels[offset + 3] = Math.round(alphaAvg);
    }
  }

  return pixels;
}

// --- minimal PNG encoder ---------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(rgba, size) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlace

  // One filter byte (0 = None) in front of every scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Box-filter downscale that works for any source/target ratio. */
function downscale(rgba, from, to) {
  const out = Buffer.alloc(to * to * 4);

  for (let y = 0; y < to; y += 1) {
    const y0 = Math.floor((y * from) / to);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * from) / to));

    for (let x = 0; x < to; x += 1) {
      const x0 = Math.floor((x * from) / to);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * from) / to));

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let sy = y0; sy < y1; sy += 1) {
        for (let sx = x0; sx < x1; sx += 1) {
          const offset = (sy * from + sx) * 4;
          // Premultiply so transparent edge pixels do not darken the average.
          const alpha = rgba[offset + 3] / 255;
          r += rgba[offset] * alpha;
          g += rgba[offset + 1] * alpha;
          b += rgba[offset + 2] * alpha;
          a += rgba[offset + 3];
          n += 1;
        }
      }

      const alphaAvg = a / n;
      const weight = a / 255 || 1;
      const offset = (y * to + x) * 4;
      out[offset] = Math.round(r / weight);
      out[offset + 1] = Math.round(g / weight);
      out[offset + 2] = Math.round(b / weight);
      out[offset + 3] = Math.round(alphaAvg);
    }
  }

  return out;
}

/** Wraps PNG images in an ICO container (PNG-compressed entries, Vista+). */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(16 * images.length);
  let offset = header.length + directory.length;

  images.forEach((image, index) => {
    const entry = index * 16;
    directory[entry] = image.size >= 256 ? 0 : image.size;
    directory[entry + 1] = image.size >= 256 ? 0 : image.size;
    directory[entry + 2] = 0; // palette size
    directory[entry + 3] = 0; // reserved
    directory.writeUInt16LE(1, entry + 4); // colour planes
    directory.writeUInt16LE(32, entry + 6); // bits per pixel
    directory.writeUInt32LE(image.png.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.png.length;
  });

  return Buffer.concat([header, directory, ...images.map((image) => image.png)]);
}

// --- main ------------------------------------------------------------------

const buildDir = path.join(projectRoot, 'build');
mkdirSync(buildDir, { recursive: true });

const master = renderRgba();

const png512 = encodePng(master, SIZE);
writeFileSync(path.join(buildDir, 'icon.png'), png512);

const icoSizes = [256, 128, 64, 48, 32, 16];
const icoImages = icoSizes.map((size) => ({
  size,
  png: encodePng(size === SIZE ? master : downscale(master, SIZE, size), size),
}));
writeFileSync(path.join(buildDir, 'icon.ico'), encodeIco(icoImages));

console.log(`[icon] wrote build/icon.png (${SIZE}x${SIZE}) and build/icon.ico (${icoSizes.join(', ')})`);
