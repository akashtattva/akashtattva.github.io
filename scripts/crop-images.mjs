import sharp from 'sharp';
import { join, parse } from 'path';

const IMG_DIR = 'public/assets/img';

// Crop a PNG/JPG in public/assets/img to the given region and save as a new PNG.
//
// Usage:
//   node scripts/crop-images.mjs <file> <left> <top> <width> <height> [--out <name>]
//
// Coordinates are in pixels. Use --pct to interpret them as percentages
// (0-100) of the image size instead.
//
// Examples:
//   node scripts/crop-images.mjs ch_fig1_overview.png 50 100 800 600
//   node scripts/crop-images.mjs ch_fig1_overview.png 5 10 80 60 --pct --out ch_fig1_overview_cropped.png
//
// The cropped result is saved to <name>_cropped.png by default (or the value
// passed to --out). Run optimize-images.mjs afterwards to make the WebP.

const [,, file, l, t, w, h, ...rest] = process.argv;
const opts = new Map();
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--out') { opts.set('out', rest[i + 1]); i++; }
  if (rest[i] === '--pct') opts.set('pct', true);
}

async function main() {
  const left = Number(l);
  const top = Number(t);
  const reqW = Number(w);
  const reqH = Number(h);
  if (!file || [left, top, reqW, reqH].some(n => !Number.isFinite(n) || n < 0)) {
    console.error('Usage: node scripts/crop-images.mjs <file> <left> <top> <width> <height> [--out <name>] [--pct]');
    process.exit(1);
  }

  const inputPath = join(IMG_DIR, file);
  const meta = await sharp(inputPath).metadata();

  const clamp = (v, max) => Math.max(0, Math.min(Math.round(v), max));
  const toAbs = (v, size) => (opts.get('pct') ? (v / 100) * size : v);

  const x = clamp(toAbs(left, meta.width), meta.width);
  const y = clamp(toAbs(top, meta.height), meta.height);
  const cw = clamp(toAbs(reqW, meta.width), meta.width - x);
  const ch = clamp(toAbs(reqH, meta.height), meta.height - y);

  const outName = opts.get('out') ?? parse(file).name + '_cropped.png';
  const outPath = join(IMG_DIR, outName);

  await sharp(inputPath)
    .extract({ left: x, top: y, width: cw, height: ch })
    .png()
    .toFile(outPath);

  console.log(`  ${file} → ${outName} (${cw}x${ch}px at ${x},${y})`);
}

main().catch(err => { console.error(err); process.exit(1); });
