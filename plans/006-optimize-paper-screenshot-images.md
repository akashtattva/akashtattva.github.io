# Plan 006: Optimize paper screenshot images (WebP + resize)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 5a36df8..HEAD -- public/assets/img/ src/content/posts/ package.json`
> If files in these paths have changed since this plan was written, compare
> the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `5a36df8`, 2026-07-27
- **Issue**: (none)

## Why this matters

All 22 images in `public/assets/img/` are full-page PDF screenshots at 1275×1650px stored as uncompressed PNGs. Each is ~800–1200 KB, totaling **21.1 MB** for the entire set. A single blog post with 10 images loads ~10 MB of images, which is the dominant factor in page load time. Converting to WebP at 800px max width reduces each image to ~50–150 KB with no visible quality loss for screenshots (which are mostly text and line art). This yields a **10–20× bandwidth reduction**.

Additionally, one post references a non-existent image (`/assets/img/image_1.png`).

## Current state

**22 PNG images in `public/assets/img/`** — all 1275×1650px, 800–1200 KB each:

```
fig12_testtime.png                    1275x1650   1209 KB
fig13_testtime_results.png            1275x1650    979 KB
fig1_main_results.png                 1275x1650    978 KB
fig2_rlvr_vs_rlrf_and_fig3_feedback.png 1275x1650 1107 KB
fig4_self_teaching.png                1275x1650    924 KB
fig5_compute_overhead.png             1275x1650    935 KB
fig6_training_progression.png         1275x1650    841 KB
fig7_response_comparison.png          1275x1650   1085 KB
fig8_scaling.png                      1275x1650    850 KB
fig9_credit_assignment.png            1275x1650    980 KB
opsd_fig1_overview.png                1275x1650   1105 KB
opsd_fig2_prompts.png                 1275x1650    925 KB
opsd_fig3_token_efficiency.png        1275x1650   1216 KB
opsd_fig4_clipping_fig5_length.png    1275x1650   1211 KB
opsd_table1_comparison.png            1275x1650   1040 KB
popsd_fig1_opsd_fails.png             1275x1650    830 KB
popsd_fig2_epistemic_markers.png      1275x1650    948 KB
popsd_fig3_teacher_decomp.png         1275x1650    867 KB
popsd_fig4_training_dynamics.png      1275x1650    897 KB
popsd_fig5_markers_and_fig6_ablations.png 1275x1650 920 KB
popsd_fig7_ablation_beta.png          1275x1650    933 KB
popsd_table1_main_results.png         1275x1650    837 KB
```

**Markdown image references** — all use `/assets/img/*.png` paths:
- `src/content/posts/2026-07-02-reinforcement-learning-via-self-distillation.md` — 10 images
- `src/content/posts/2026-06-25-on-policy-self-distillation-llms.md` — 4 images
- `src/content/posts/2026-07-03-purified-opsd-paper-notes.md` — 7 images

**Broken reference** in `src/content/posts/2025-10-09-process-reward-model.md:8`:
```markdown
![Deepseek R1 technical report](/assets/img/image_1.png)
```
`image_1.png` does not exist in `public/assets/img/`.

**No image optimization pipeline** — `astro.config.mjs` has no image service config, `sharp` is not installed, no `loading="lazy"` on images.

**Repo conventions** (match these):
- All content in `.md` files under `src/content/posts/`
- Images are root-relative (`/assets/img/...`)
- Package scripts in `package.json` use `"type": "module"`

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install sharp | `npm install --save-dev sharp` | exit 0 |
| Run conversion | `node scripts/optimize-images.mjs` | exit 0, "Converted N images" |
| Build | `npm run build` | exit 0 |

## Scope

**In scope**:
- `public/assets/img/*.png` — convert to WebP at 80% quality, max 800px width
- `scripts/optimize-images.mjs` — create the conversion script
- `src/content/posts/*.md` — update `.png` image references to `.webp`
- `package.json` — no changes needed beyond adding `sharp`; the conversion is manual (run before build)

**Out of scope**:
- Images used in `.astro` components (none exist)
- The favicon or cover SVG
- Adding lazy loading (`loading="lazy"`) — Astro's markdown renderer controls this; adding it requires a rehype plugin, which is a separate concern
- CSS changes
- The original PNG files — keep them in the repo as source; the WebP files are the optimized versions served in production

## Git workflow

- Branch: `advisor/006-optimize-images`
- Recommended commits:
  1. `chore: install sharp`
  2. `perf: add image optimization script`
  3. `perf: convert all paper screenshots to WebP at 800px`
  4. `fix: update markdown image references from .png to .webp`
  5. `fix: remove broken image_1.png reference in process-reward-model post`
- Do NOT push or open a PR unless the operator instructed it

## Steps

### Step 1: Install sharp

```bash
npm install --save-dev sharp
```

**Verify**: `npx sharp --version` or check `node_modules/sharp/package.json` exists.

### Step 2: Create the optimization script

Create `scripts/optimize-images.mjs`:

```js
import sharp from 'sharp';
import { readdirSync, existsSync, mkdirSync } from 'fs';
import { join, parse } from 'path';

const IMG_DIR = 'public/assets/img';
const MAX_WIDTH = 800;
const QUALITY = 80;

async function main() {
  const files = readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
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
```

**Verify**: The file exists at `scripts/optimize-images.mjs` and is valid JS syntax:
```bash
node -c scripts/optimize-images.mjs
```
Expected: exits 0 with no output or "SyntaxError" (if there's a syntax issue).

### Step 3: Run the conversion

```bash
node scripts/optimize-images.mjs
```

Expected output shows each file being converted. Verify that `.webp` files now exist alongside the `.png` files in `public/assets/img/`:

```bash
ls public/assets/img/*.webp | Measure-Object -Line
```
Expected: 22 `.webp` files.

### Step 4: Verify file size reduction

```bash
Get-ChildItem public\assets\img\*.png,public\assets\img\*.webp | Group-Object Extension | Select-Object Name, @{N="TotalKB";E={[math]::Round((($_.Group | Measure-Object Length -Sum).Sum)/1KB, 0)}}
```

Expected output shows total PNG size (~21,600 KB) vs total WebP size (should be ~1,500–2,500 KB — roughly 10× smaller).

### Step 5: Update markdown image references

Update all `.md` files in `src/content/posts/` that reference `.png` images in `/assets/img/`. Change each reference from:

```markdown
](/assets/img/filename.png)
```

to:

```markdown
](/assets/img/filename.webp)
```

The files to update are:
- `src/content/posts/2026-06-25-on-policy-self-distillation-llms.md` (4 references)
- `src/content/posts/2026-07-02-reinforcement-learning-via-self-distillation.md` (10 references)
- `src/content/posts/2026-07-03-purified-opsd-paper-notes.md` (7 references)

**Verify**: Run a grep to confirm no remaining `.png` image references in posts:
```bash
grep -rn '](/assets/img/.*\.png)' src/content/posts/
```
Expected: no matches.

### Step 6: Fix the broken image reference

In `src/content/posts/2025-10-09-process-reward-model.md`, line 8 references `/assets/img/image_1.png` which doesn't exist and has no corresponding screenshot. Since the original image source is lost, remove this image reference:

Change line 8 from:
```markdown
![Deepseek R1 technical report](/assets/img/image_1.png)
```
to an italic note:
```markdown
*Deepseek R1 technical report (diagram from the original paper)*
```

**Verify**: `grep -n 'image_1' src/content/posts/` returns no matches.

### Step 7: Build

```bash
npm run build
```

Expected: exit 0. No broken image references in the output.

## Test plan

If Plan 003's build smoke test is in place, run it:
```bash
npm test
```
Expected: all pass.

Manual verification: open `dist/index.html` and navigate to a post page with images (e.g., the SDPO notes). Open DevTools → Network tab and confirm images load as `.webp` at ~50–150 KB each.

## Done criteria

- [ ] `node scripts/optimize-images.mjs` exits 0 and produces 22 `.webp` files
- [ ] Total WebP size in `public/assets/img/` is less than 3 MB (vs 21.1 MB for PNGs)
- [ ] `grep -rn '](/assets/img/.*\.png)' src/content/posts/` returns no matches
- [ ] `grep -n 'image_1' src/content/posts/` returns no matches
- [ ] `npm run build` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `sharp` fails to install (native module compilation issues on Windows) — alternatives: try `npx @squoosh/cli` or manual conversion via online tools.
- A `.webp` file is significantly larger than the original PNG (unlikely for screenshots, but possible for some image types).
- A markdown file has a `.png` reference that doesn't match any file in `public/assets/img/` — note it and stop before deleting anything you can't verify.
- A post contains images that are NOT paper screenshots (photos, diagrams with fine detail) — WebP lossy compression at 80% quality is still good, but check visually if uncertain.
- `npm run build` fails with image-related errors.

## Maintenance notes

- **Future images**: add new screenshots as PNGs to `public/assets/img/`, then run `node scripts/optimize-images.mjs` before building to convert them to WebP. The script is idempotent — it skips images that already have a WebP at the target size.
- **Add to build pipeline** (optional future improvement): add `"prebuild": "node scripts/optimize-images.mjs"` to `package.json` scripts to auto-convert before every build.
- **The original PNGs serve as source files** — keep them in the repo for re-exporting at different sizes if the layout changes. Git will track both PNG and WebP files; the WebP is what gets served.
- **If WebP compatibility is a concern**: all modern browsers (Chrome, Firefox, Safari 14+, Edge) support WebP as of 2024. For a personal blog, this is not a concern.
- **Image `image_1.png`** in the process-reward-model post had no source file; it was likely a screenshot deleted by accident. The replacement italic note preserves the content intent.
