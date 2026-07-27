import sharp from 'sharp';
import { readdirSync, existsSync } from 'fs';
import { join, parse } from 'path';

const IMG_DIR = 'public/assets/img';
const MAX_WIDTH = 800;
const QUALITY = 80;

async function main() {
  const files = readdirSync(IMG_DIR).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
  let converted = 0;
  let skipped = 0;

  for (const file of files) {
    const inputPath = join(IMG_DIR, file);
    const outputName = parse(file).name + '.webp';
    const outputPath = join(IMG_DIR, outputName);

    const metadata = await sharp(inputPath).metadata();
    if (metadata.width <= MAX_WIDTH && existsSync(outputPath)) {
      skipped++;
      continue;
    }

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
