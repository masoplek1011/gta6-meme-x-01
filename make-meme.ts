// make-meme.ts — draws the gta6-meme-x-01 meme from code alone and writes
// meme.png (1080x1080) next to this file.
//
// Everything is procedural: a synthwave Vice City sunset, the make.fun ghost
// with its sparkle eyes holding a game controller and its magenta star coin,
// and a two-part caption in big white letters with a thick black outline.
// Node 22 standard library only: no network, no wall clock, no randomness
// without a seed, so two runs write byte-identical files.

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 1080;
const H = 1080;
const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Pixel buffer and colour helpers
// ---------------------------------------------------------------------------

const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

function setPx(x: number, y: number, c: RGB): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= W || iy < 0 || iy >= H) return;
  const o = (iy * W + ix) * 3;
  buf[o] = c[0];
  buf[o + 1] = c[1];
  buf[o + 2] = c[2];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// A fixed-seed generator: deterministic, and the only "randomness" used.
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261119);

// ---------------------------------------------------------------------------
// Drawing primitives
// ---------------------------------------------------------------------------

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPx(xx, yy, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    const dy = y - cy;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    for (let x = Math.floor(cx - dx); x <= Math.ceil(cx + dx); x++) setPx(x, y, c);
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const t = (y - cy) / ry;
    const dx = rx * Math.sqrt(Math.max(0, 1 - t * t));
    for (let x = Math.floor(cx - dx); x <= Math.ceil(cx + dx); x++) setPx(x, y, c);
  }
}

// Scanline fill of a polygon given as [x, y] points.
function fillPoly(points: Array<[number, number]>, c: RGB): void {
  let minY = H;
  let maxY = 0;
  for (const [, y] of points) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(H - 1, Math.ceil(maxY)); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) setPx(x, y, c);
    }
  }
}

function scalePoly(points: Array<[number, number]>, cx: number, cy: number, s: number): Array<[number, number]> {
  return points.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s]);
}

// A thick line drawn as a chain of circles.
function thickLine(x1: number, y1: number, x2: number, y2: number, w: number, c: RGB): void {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(len / 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    fillCircle(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, w / 2, c);
  }
}

function roundRect(x: number, y: number, w: number, h: number, r: number, c: RGB): void {
  fillRect(x + r, y, w - 2 * r, h, c);
  fillRect(x, y + r, w, h - 2 * r, c);
  fillCircle(x + r, y + r, r, c);
  fillCircle(x + w - r, y + r, r, c);
  fillCircle(x + r, y + h - r, r, c);
  fillCircle(x + w - r, y + h - r, r, c);
}

// Four-pointed sparkle (the make.fun ghost's eyes).
function star4(cx: number, cy: number, r: number, c: RGB): void {
  const p: Array<[number, number]> = [];
  const inner = r * 0.22;
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI / 4) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    p.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
  }
  fillPoly(p, c);
}

// Five-pointed star (for the magenta coin).
function star5(cx: number, cy: number, r: number, c: RGB): void {
  const p: Array<[number, number]> = [];
  const inner = r * 0.42;
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    p.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
  }
  fillPoly(p, c);
}

// ---------------------------------------------------------------------------
// Bitmap font (5x7) and caption text
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '3': ['11111', '00010', '00010', '01110', '00010', '00010', '11111'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [10, 6, 18];

function drawGlyph(ch: string, x: number, y: number, s: number, c: RGB): void {
  const g = FONT[ch];
  if (!g) return;
  const bold = Math.max(1, Math.ceil(s * 0.45));
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (g[row][col] === '1') {
        fillRect(x + col * s, y + row * s, s + bold, s, c);
      }
    }
  }
}

// White text with a thick black outline, centred on cx at top y.
function drawText(text: string, cx: number, y: number, s: number): void {
  const adv = 6 * s;
  const total = text.length * adv - s;
  const x0 = cx - total / 2;
  const d = Math.max(2, Math.round(s * 0.5));
  const offsets: Array<[number, number]> = [
    [-d, 0], [d, 0], [0, -d], [0, d],
    [-d, -d], [d, -d], [-d, d], [d, d],
  ];
  for (const [ox, oy] of offsets) {
    for (let i = 0; i < text.length; i++) {
      drawGlyph(text[i], x0 + i * adv + ox, y + oy, s, BLACK);
    }
  }
  for (let i = 0; i < text.length; i++) {
    drawGlyph(text[i], x0 + i * adv, y, s, WHITE);
  }
}

// ---------------------------------------------------------------------------
// Sky, sun, skyline, ground
// ---------------------------------------------------------------------------

const SKY_STOPS: Array<[number, RGB]> = [
  [0.0, [24, 8, 58]],
  [0.3, [92, 20, 108]],
  [0.52, [176, 32, 118]],
  [0.68, [232, 64, 92]],
  [0.8, [255, 122, 47]],
  [0.92, [255, 205, 64]],
  [1.0, [255, 216, 96]],
];

function skyAt(y: number): RGB {
  const t = Math.min(1, Math.max(0, y / 880));
  for (let i = 1; i < SKY_STOPS.length; i++) {
    if (t <= SKY_STOPS[i][0]) {
      const [t0, c0] = SKY_STOPS[i - 1];
      const [t1, c1] = SKY_STOPS[i];
      return mix(c0, c1, (t - t0) / (t1 - t0));
    }
  }
  return SKY_STOPS[SKY_STOPS.length - 1][1];
}

function drawSky(): void {
  for (let y = 0; y < 880; y++) fillRect(0, y, W, 1, skyAt(y));
  // Stars in the upper sky.
  for (let i = 0; i < 110; i++) {
    const x = rnd() * W;
    const y = rnd() * 400;
    const r = rnd() < 0.12 ? 2 : 1;
    fillCircle(x, y, r, WHITE);
  }
}

function drawSun(): void {
  const cx = 540;
  const cy = 570;
  const r = 255;
  const top: RGB = [255, 224, 102];
  const mid: RGB = [255, 154, 61];
  const bot: RGB = [255, 77, 126];
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    const t = (y - (cy - r)) / (2 * r);
    const c = t < 0.5 ? mix(top, mid, t * 2) : mix(mid, bot, (t - 0.5) * 2);
    fillRect(cx - dx, y, dx * 2, 1, c);
  }
  // Synthwave slits across the sun's lower half, in sky colours.
  const slits: Array<[number, number]> = [
    [600, 6], [626, 7], [654, 8], [684, 10], [716, 12], [750, 14], [786, 16],
  ];
  for (const [sy, sh] of slits) {
    const dy = sy - cy;
    const dx = Math.sqrt(Math.max(0, r * r - dy * dy));
    for (let y = sy; y < sy + sh; y++) fillRect(cx - dx, y, dx * 2, 1, skyAt(y));
  }
}

function drawSkyline(): void {
  // Far row, lighter purple.
  let x = -20;
  while (x < W) {
    const w = 60 + rnd() * 90;
    const h = 110 + rnd() * 150;
    fillRect(x, 820 - h, w, h, [44, 19, 84]);
    x += w + 8 + rnd() * 30;
  }
  // Near row, near-black, with lit windows.
  x = -30;
  while (x < W) {
    const w = 70 + rnd() * 110;
    const h = 80 + rnd() * 130;
    const top = 880 - h;
    fillRect(x, top, w, h, [21, 10, 36]);
    for (let wy = top + 14; wy < 868; wy += 22) {
      for (let wx = x + 10; wx < x + w - 10; wx += 18) {
        if (rnd() < 0.38) fillRect(wx, wy, 5, 7, [255, 215, 106]);
      }
    }
    x += w + 6 + rnd() * 24;
  }
  // Ground and a thin magenta horizon glow.
  fillRect(0, 880, W, 200, [18, 8, 31]);
  fillRect(0, 880, W, 3, [255, 77, 158]);
}

function drawPalm(baseX: number, topX: number, topY: number, lean: number): void {
  const C: RGB = [13, 6, 22];
  // Curved trunk: sample a quadratic bend.
  const steps = 24;
  let px = baseX;
  let py = 1080;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const bx = baseX + (topX - baseX) * t + lean * Math.sin(t * Math.PI) * 0.4;
    const by = 1080 + (topY - 1080) * t;
    thickLine(px, py, bx, by, 16 - 8 * t, C);
    px = bx;
    py = by;
  }
  // Fronds fan out from the crown as smooth drooping curves: each one is a
  // sampled quadratic arc that rises first, then hangs down at the tip.
  const fronds = 7;
  for (let i = 0; i < fronds; i++) {
    // Spread from near-horizontal left, over the top, to near-horizontal right.
    const th = (-168 + (i / (fronds - 1)) * 156) * (Math.PI / 180);
    const len = 130 + rnd() * 50;
    const ex = topX + Math.cos(th) * len * 1.3;
    const ey = topY + Math.sin(th) * len * 0.8 + 92;
    // Control point: pushed out and up so the frond arches, not kinks.
    const qx = topX + Math.cos(th) * len * 0.75;
    const qy = topY + Math.sin(th) * len * 0.75 - 52;
    let lx = topX;
    let ly = topY;
    const segs = 14;
    for (let s = 1; s <= segs; s++) {
      const t = s / segs;
      const bx = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * qx + t * t * ex;
      const by = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * qy + t * t * ey;
      thickLine(lx, ly, bx, by, 10 - 5 * t, C);
      lx = bx;
      ly = by;
    }
  }
}

// ---------------------------------------------------------------------------
// The make.fun ghost, its controller and its star coin
// ---------------------------------------------------------------------------

function ghostBody(): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const cx = 540;
  const cy = 520;
  const r = 190;
  // Dome: top semicircle, left to right.
  for (let a = Math.PI; a <= Math.PI * 2 + 0.001; a += 0.06) {
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  // Right side down.
  pts.push([730, 720]);
  // Wavy hem: three bumps back to the left.
  for (let t = 0; t <= 1.0001; t += 0.04) {
    const x = 730 - t * 380;
    const y = 720 + 26 * Math.sin(t * Math.PI * 3);
    pts.push([x, y]);
  }
  pts.push([350, 520]);
  return pts;
}

function drawGhost(): void {
  const body = ghostBody();
  // Thick black outline: the same shape, scaled up around its centre.
  fillPoly(scalePoly(body, 540, 540, 1.05), BLACK);
  fillPoly(body, WHITE);
  // Sparkle eyes.
  star4(468, 480, 38, BLACK);
  star4(612, 480, 38, BLACK);
  fillCircle(456, 466, 6, WHITE);
  fillCircle(600, 466, 6, WHITE);
  // Small smile.
  fillEllipse(540, 566, 24, 12, BLACK);
  // Game controller, held low in front of the ghost.
  const cx = 540;
  const cy = 712;
  roundRect(cx - 150, cy - 58, 300, 116, 34, BLACK);
  roundRect(cx - 142, cy - 50, 284, 100, 28, [35, 35, 46]);
  // D-pad.
  fillRect(cx - 108, cy - 9, 56, 18, [216, 216, 232]);
  fillRect(cx - 89, cy - 28, 18, 56, [216, 216, 232]);
  // Face buttons in a diamond.
  fillCircle(cx + 96, cy - 26, 12, [255, 46, 136]);
  fillCircle(cx + 122, cy, 12, [255, 210, 63]);
  fillCircle(cx + 96, cy + 26, 12, [53, 208, 255]);
  fillCircle(cx + 70, cy, 12, [74, 222, 128]);
  // Analogue sticks.
  fillCircle(cx - 18, cy + 30, 13, [85, 85, 106]);
  fillCircle(cx + 30, cy + 30, 13, [85, 85, 106]);
  // Little round hands gripping the controller's top corners.
  fillCircle(cx - 138, cy - 46, 28, BLACK);
  fillCircle(cx - 138, cy - 46, 23, WHITE);
  fillCircle(cx + 138, cy - 46, 28, BLACK);
  fillCircle(cx + 138, cy - 46, 23, WHITE);
}

function drawStarCoin(): void {
  const cx = 818;
  const cy = 296;
  fillCircle(cx, cy, 78, [255, 93, 177]);
  fillCircle(cx, cy, 66, BLACK);
  fillCircle(cx, cy, 60, [233, 30, 140]);
  star5(cx, cy, 40, WHITE);
  // A small sparkle beside the coin.
  star4(cx + 78, cy - 62, 16, WHITE);
}

// ---------------------------------------------------------------------------
// PNG encoding (zlib + CRC32, standard library only)
// ---------------------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcData = new Uint8Array(4 + data.length);
  crcData.set(out.subarray(4, 8 + data.length));
  view.setUint32(8 + data.length, crc32(crcData));
  return out;
}

function encodePng(): Uint8Array {
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, W);
  iv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });

  const parts = [chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const total = sig.length + parts.reduce((s, p) => s + p.length, 0);
  const png = new Uint8Array(total);
  let o = 0;
  png.set(sig, o);
  o += sig.length;
  for (const p of parts) {
    png.set(p, o);
    o += p.length;
  }
  return png;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

drawSky();
drawSun();
drawSkyline();
drawPalm(96, 168, 560, 60);
drawPalm(984, 912, 580, -60);
drawGhost();
drawStarCoin();

drawText('WAITED 13 YEARS', 540, 34, 9);
drawText('FOR GTA 6', 540, 126, 11);
drawText('MY AI AGENT BOUGHT IT', 540, 884, 7);
drawText('ON MAKE.FUN', 540, 956, 10);

writeFileSync(join(here, 'meme.png'), encodePng());
