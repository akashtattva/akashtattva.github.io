import sharp from 'sharp';
import { readdirSync, existsSync, statSync } from 'fs';
import { join, parse } from 'path';

const IMG_DIR = 'public/assets/img';

// Options:
//   --max-width=<px>   override resize width (default 800; use higher for dense figures)
//   --quality=<n>      override webp quality 0-100 (default 80)
//   anything else      filename/prefix filter to convert only those
// Examples:
//   node scripts/optimize-images.mjs ch_fig
//   node scripts/optimize-images.mjs ch_fig --max-width=1000 --quality=85
const args = process.argv.slice(2);
const opt = {};
for (const a of args) {
  const m = a.match(/^--([a-z-]+)=?(.*)$/);
  if (m) opt[m[1]] = m[2] === '' ? true : m[2];
}
const only = args.filter(a => !a.startsWith('--'));
const MAX_WIDTH = opt['max-width'] ? Number(opt['max-width']) : 800;
const QUALITY = opt.quality ? Number(opt.quality) : 80;

async function main() {
  const files = readdirSync(IMG_DIR)
    .filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
    .filter(f => only.length === 0 || only.some(o => f.includes(o)));

  let converted = 0;
  let skipped = 0;

  for (const file of files) {
    const inputPath = join(IMG_DIR, file);
    const outputName = parse(file).name + '.webp';
    const outputPath = join(IMG_DIR, outputName);

    // Skip if the WebP already exists and is at least as new as the source.
    if (existsSync(outputPath) && statSync(outputPath).mtimeMs >= statSync(inputPath).mtimeMs) {
      skipped++;
      continue;
    }

    const metadata = await sharp(inputPath).metadata();
    await sharp(inputPath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    console.log(`  ${file} → ${outputName} (${metadata.width}px → ${Math.min(metadata.width, MAX_WIDTH)}px)`);
    converted++;
  }

  console.log(`\nDone: ${converted} converted, ${skipped} skipped`);
}

main().catch(err => { console.error(err); process.exit(1); });
