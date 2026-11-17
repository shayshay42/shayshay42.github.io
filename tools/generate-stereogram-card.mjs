// Render the card's real parallel-view stereogram from the shared pixel T-Rex.
// Run: node tools/generate-stereogram-card.mjs
// Requires sharp. SHARP_MODULE can point to its ESM entry on another machine.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { CHROME_TREX_ROWS } from '../assets/projects/chrome-runner-mask.js';

const directory = new URL('../assets/projects/', import.meta.url);
const WIDTH = 1200, HEIGHT = 750;
const FAR = 150, MU = 0.32, DEPTH = 0.8, SCALE = 10, SEED = 4242;
const near = Math.round(2 * FAR * (1 - MU * DEPTH) / (2 - MU * DEPTH));
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const hash = (x, y, seed = SEED) => {
  let value = Math.imul(x + 1, 0x9e3779b1) ^ Math.imul(y + 1, 0x85ebca6b) ^ seed;
  value = Math.imul(value ^ value >>> 16, 0x7feb352d);
  value = Math.imul(value ^ value >>> 15, 0x846ca68b);
  return (value ^ value >>> 16) >>> 0;
};

// Periodic value noise permits a continuous, horizontally repeating texture.
function noise(x, y, period = 8, seed = SEED) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const sx = smooth(x - ix), sy = smooth(y - iy);
  const value = (a, b) => hash((a % period + period) % period, b, seed) / 4294967295;
  return mix(mix(value(ix, iy), value(ix + 1, iy), sx),
    mix(value(ix, iy + 1), value(ix + 1, iy + 1), sx), sy);
}

function hsv(h, s, v) {
  h = (h % 1 + 1) % 1 * 6;
  const f = h - Math.floor(h), p = v * (1 - s);
  const q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const rgb = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][Math.floor(h)];
  return rgb.map(value => Math.round(clamp(value) * 255));
}

// Each correspondence class receives this color once. All class members copy
// it exactly, so the swirls, veins and grain never break stereo correspondence.
function colorAt(x, y) {
  const u = ((x % FAR) + FAR) % FAR / FAR, v = y / FAR;
  const broad = noise(u * 8, v * 3, 8);
  const warp = noise(u * 16, v * 6, 16, SEED + 19);
  const px = u + 0.16 * Math.sin(2 * Math.PI * (u + v * 0.24)) + (broad - 0.5) * 0.22;
  const py = v + (warp - 0.5) * 0.3;
  const field = 0.62 * noise(px * 8, py * 4, 8, SEED + 7)
    + 0.26 * noise(px * 16, py * 8, 16, SEED + 13)
    + 0.12 * noise(px * 32, py * 16, 32, SEED + 23);
  const contour = Math.abs(Math.sin(field * Math.PI * 13));
  const veins = 1 - smooth(clamp((contour - 0.055) / 0.16));
  const fine = noise(px * 64, py * 32, 64, SEED + 37);
  const grain = hash(x, y, SEED + 47) / 4294967295 - 0.5;
  const hue = 0.08 + field * 1.7 + py * 0.16 + 0.2 * Math.sin(px * Math.PI * 2);
  const light = clamp(0.70 + (broad - 0.5) * 0.27 + (fine - 0.5) * 0.12 + grain * 0.16);
  const [r, g, b] = hsv(hue, 0.60 + warp * 0.22, light * (1 - veins * 0.76));
  return r << 16 | g << 8 | b;
}

function makeDepth() {
  assert.equal(CHROME_TREX_ROWS.length, 47);
  assert.ok(CHROME_TREX_ROWS.every(row => row.length === 44));
  const depth = new Float32Array(WIDTH * HEIGHT);
  const x0 = (WIDTH - 44 * SCALE) / 2, y0 = (HEIGHT - 47 * SCALE) / 2;
  CHROME_TREX_ROWS.forEach((row, sy) => {
    [...row].forEach((cell, sx) => {
      if (cell !== '#') return;
      for (let dy = 0; dy < SCALE; dy++) {
        depth.fill(DEPTH, (y0 + sy * SCALE + dy) * WIDTH + x0 + sx * SCALE,
          (y0 + sy * SCALE + dy) * WIDTH + x0 + (sx + 1) * SCALE);
      }
    });
  });
  return depth;
}

// TIW scanline constraints and hidden-surface removal, adapted from this site's
// Stereogram Runner encoder (stereogram-studio/lib/stereogram.ts). The geometric
// construction follows Thimbleby, Inglis & Witten, Displaying 3D Images (1994).
function encode(depth) {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  const parent = new Int32Array(WIDTH), colors = new Uint32Array(WIDTH);
  const lefts = new Int32Array(WIDTH), rights = new Int32Array(WIDTH);
  const root = position => {
    let representative = position;
    while (parent[representative] !== representative) representative = parent[representative];
    while (parent[position] !== position) {
      const next = parent[position]; parent[position] = representative; position = next;
    }
    return representative;
  };
  let checked = 0, foreground = 0, background = 0;
  for (let y = 0; y < HEIGHT; y++) {
    const row = depth.subarray(y * WIDTH, (y + 1) * WIDTH);
    let maximum = 0, first = WIDTH, last = -1, count = 0;
    for (let x = 0; x < WIDTH; x++) {
      parent[x] = x;
      maximum = Math.max(maximum, row[x]);
      if (row[x] > 0) { first = Math.min(first, x); last = x; }
    }
    for (let x = 0; x < WIDTH; x++) {
      const z = row[x];
      const separation = Math.round(2 * FAR * (1 - MU * z) / (2 - MU * z));
      const left = x - Math.floor((separation + (separation & y & 1)) / 2);
      const right = left + separation;
      if (left < 0 || right >= WIDTH) continue;
      let visible = true;
      if (z < maximum) {
        const slope = 2 * (2 - MU * z) / (MU * 2 * FAR);
        const reach = Math.floor((maximum - z) / slope);
        for (let distance = 1; distance <= reach; distance++) {
          if (x + reach < first || x - reach > last) break;
          const rayDepth = z + slope * distance;
          if ((x >= distance && row[x - distance] >= rayDepth)
            || (x + distance < WIDTH && row[x + distance] >= rayDepth)) {
            visible = false; break;
          }
        }
      }
      if (!visible) continue;
      const a = root(left), b = root(right);
      if (a < b) parent[a] = b;
      else if (b < a) parent[b] = a;
      lefts[count] = left; rights[count++] = right;
      if (z > 0) foreground++; else background++;
    }
    for (let x = WIDTH - 1; x >= 0; x--) {
      colors[x] = parent[x] === x ? colorAt(x, y) : colors[parent[x]];
      const i = (y * WIDTH + x) * 4;
      pixels[i] = colors[x] >>> 16; pixels[i + 1] = colors[x] >>> 8;
      pixels[i + 2] = colors[x]; pixels[i + 3] = 255;
    }
    for (let i = 0; i < count; i++) assert.equal(colors[lefts[i]], colors[rights[i]]);
    checked += count;
  }
  return { pixels, checked, foreground, background };
}

let sharp;
const candidates = process.env.SHARP_MODULE
  ? [pathToFileURL(process.env.SHARP_MODULE).href]
  : ['sharp', new URL('../../voice-laser-lab/node_modules/sharp/dist/index.mjs', import.meta.url).href];
for (const module of candidates) {
  try { sharp = (await import(module)).default; break; } catch {}
}
if (!sharp) throw new Error('Install sharp or set SHARP_MODULE to its ESM entry.');

await mkdir(directory, { recursive: true });
const depth = makeDepth(), encoded = encode(depth), repeated = encode(depth);
assert.ok(Buffer.from(encoded.pixels).equals(Buffer.from(repeated.pixels)), 'Fixed inputs must reproduce the same image.');
assert.equal(near, 128);
assert.equal(encoded.foreground, [...CHROME_TREX_ROWS.join('')].filter(cell => cell === '#').length * SCALE * SCALE);
assert.ok(encoded.background > 500_000);
// Flat patches away from occluding edges must prefer their own disparity.
// A constant image would fail the wrong-period check even if all pairs matched.
const matching = (box, expected, other) => {
  let count = 0, correct = 0, wrong = 0;
  const equal = (x, y, lag) => {
    const a = (y * WIDTH + x) * 4, b = a + lag * 4;
    return encoded.pixels[a] === encoded.pixels[b]
      && encoded.pixels[a + 1] === encoded.pixels[b + 1]
      && encoded.pixels[a + 2] === encoded.pixels[b + 2];
  };
  for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) {
    count++; correct += equal(x, y, expected); wrong += equal(x, y, other);
  }
  assert.equal(correct / count, 1);
  assert.ok(wrong / count < 0.05);
  return { samples: count, expectedPeriod: expected, otherPeriod: other,
    expectedPeriodMatch: correct / count, otherPeriodMatch: wrong / count };
};
const periodChecks = {
  background: matching([50, 50, 230, 110], FAR, near),
  foreground: matching([615, 220, 650, 250], near, FAR),
};
const grayscale = Uint8Array.from(depth, value => Math.round(value * 255));
const options = { compressionLevel: 9, adaptiveFiltering: false, palette: false };
const texturePath = new URL('stereogram-texture.png', directory);
const depthPath = new URL('stereogram-depth.png', directory);
await sharp(encoded.pixels, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } }).png(options).toFile(texturePath.pathname);
await sharp(grayscale, { raw: { width: WIDTH, height: HEIGHT, channels: 1 } }).png(options).toFile(depthPath.pathname);
const sha = data => createHash('sha256').update(data).digest('hex');
const metadata = {
  width: WIDTH, height: HEIGHT, seed: SEED, parallelView: true,
  farSpacingPixels: FAR, foregroundSpacingPixels: near, strength: MU, foregroundDepth: DEPTH,
  mask: 'chrome-runner-mask.js', maskSha256: sha(await readFile(new URL('chrome-runner-mask.js', directory))),
  maskScale: SCALE, maskPosition: [380, 140],
  algorithm: 'TIW symmetric scanline constraints with hidden-surface removal; adapted from Stereogram Runner lib/stereogram.ts.',
  reference: 'https://harold.thimbleby.net/sirds/ieee3d.pdf',
  texture: 'Original procedural periodic value noise with warped contour veins and per-class grain. No external texture image.',
  subjectAttribution: 'Chromium offline runner T-Rex. See chrome-runner-source.md and CHROMIUM-LICENSE.txt.',
  verification: { exactVisibleCorrespondences: encoded.checked, foregroundPairs: encoded.foreground,
    backgroundPairs: encoded.background, deterministicPixels: true, periodChecks },
  generated: Object.fromEntries(await Promise.all([texturePath, depthPath].map(async path => [path.pathname.split('/').at(-1), sha(await readFile(path))]))),
};
await writeFile(new URL('stereogram-texture.json', directory), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify({ texture: texturePath.pathname, depth: depthPath.pathname, ...metadata.verification }, null, 2));
