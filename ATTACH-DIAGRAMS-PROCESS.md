# Process: Attach Paper Diagrams to Blog Notes

Repo specifics: posts live in `src/content/posts/YYYY-MM-DD-<slug>.md`; the
filename without `.md` is the URL slug. There is no MDX and no cover image.
Image helpers live in `scripts/optimize-images.mjs` and
`scripts/crop-images.mjs`.

Keep source PDFs and parsed files in an untracked working folder (for example
`papers/<slug>/`), never in `src/content/posts/`. The content loader collects
`**/*.md`, so a stray `paper.md` would appear as a post.

## Step 0 — Create the post from the notes

If the notes are in `paper_notes.md`, copy or rename them to the dated post
filename:

```bash
cp papers/<slug>/paper_notes.md src/content/posts/YYYY-MM-DD-<slug>.md
```

Prepend frontmatter (no `image` key; this site has no covers):

```markdown
---
title: "..."
pubDate: YYYY-MM-DD
description: "..."
---
```

Use the schema in `src/content.config.ts`; do not copy frontmatter from another
post. Start the body at `#` (h1).

## Step 1 — Read the markdown notes

```bash
# Read the post to understand sections and find insertion points
cat src/content/posts/<post-filename>.md
```

Identify each section heading and decide which diagram fits where.

---

## Step 2 — Parse the PDF to find figures

The PDF lives in the working folder, not in `src/content/posts/`. If a parsed
text file already exists, search it directly — do not re-run `lit parse` just to
search again. If `paper.md` is already provided, do not read it end to end; grep
headings and captions and read only those line ranges.

```bash
mkdir -p ./tmp_shots

# Parse to text to find figure captions
lit parse "papers/<slug>/<pdf-filename>.pdf" --format text --no-ocr -o ./tmp_shots/paper.txt

# Search for figure/table/algorithm captions
grep -n -i -C2 -E "^figure [0-9]+|^table [0-9]+|^algorithm [0-9]+" ./tmp_shots/paper.txt
```

```bash
# Parse to JSON to get page numbers for each figure
lit parse "papers/<slug>/<pdf-filename>.pdf" --format json --no-ocr -o ./tmp_shots/paper.json

# Find which pages contain which figures
python -c "
import json, re
with open('./tmp_shots/paper.json') as f:
    data = json.load(f)
for i, page in enumerate(data['pages']):
    text = page.get('text', '')
    figures = re.findall(r'Figure\s+\d+', text)
    tables = re.findall(r'Table\s+\d+', text)
    if figures or tables:
        print(f'=== Page {i+1} ===')
        if figures: print(f'  Figures: {figures}')
        if tables: print(f'  Tables: {tables}')
"
```

---

## Step 3 — Map figures to note sections

| Note section | Best figure | Reason |
|---|---|---|
| Core idea / overview | Overview diagram (Fig 1) | Shows the big picture |
| Technical details / method | Prompt examples or architecture diagram | Shows how it works |
| Training efficiency | Token efficiency / compute charts | Supports efficiency claims |
| Experimental results | Main results table or training curves | Shows the numbers |
| Ablation studies | Ablation figures | Shows hyperparameter effects |

Prefer 5–7 key figures for a long post; skip decorative or redundant ones.

---

## Step 4 — Extract screenshots

```bash
mkdir -p ./tmp_shots

# Take low-DPI screenshots of the relevant pages only
lit screenshot "papers/<slug>/<pdf-filename>.pdf" \
  --target-pages "<page-nums>" --dpi 150 -o ./tmp_shots/
```

Use 150 DPI. Only screenshot pages that contain the key figures.

---

## Step 5 — Copy assets to public/

```bash
# Copy with descriptive names
cp ./tmp_shots/page_N.png public/assets/img/<prefix>_<kind><N>_<desc>.png
```

Naming convention: `<prefix>_<kind><N>_<short-description>.webp`, where `kind`
is `fig`, `table`, or `alg` (e.g. `vllm_fig4_system_overview.webp`,
`dsv41f_table1_base.webp`, `dh_alg3_notification.webp`).

Pick a new short prefix per paper; do not reuse a prefix across papers. Examples
already in use: `vllm`, `dsv41f`, `im`, `dh`, `ch`, `rlsvr`, `opsd`, `popsd`,
`rlm`, `gkd`, `fig`. Do not scan `public/assets/img/` just to discover prefixes.

Never commit PNG intermediates; delete them after conversion.

---

## Step 5b — Convert PNGs to WebP

If the screenshot needs cropping, do Step 5c first; conversion is incremental,
so running this step again after cropping is cheap.

The helper is manual, not a prebuild hook: `package.json` exposes it as the
`optimize-images` script. It converts PNGs in `public/assets/img/` to WebP.
**Existing posts reference `.webp` files directly.** It is incremental: it skips
any image whose `.webp` already exists and is at least as new as the source, so
re-running does not re-convert unchanged images.

```bash
# Convert only your new images (recommended — pass your prefix filter)
bun run optimize-images <prefix>

# Or convert everything (unchanged images are skipped anyway)
bun run optimize-images
```

Resolution overrides — use when an 800px-wide WebP is too small to read a dense
figure (e.g. a multi-column table or a full-page screenshot):

```bash
bun run optimize-images <prefix> --max-width=1200 --quality=85
```

The default is 800px at quality 80. Existing posts keep using 800px; only raise
it when the figure is genuinely unreadable, since bigger images cost page
weight.

After conversion, delete the source PNGs to avoid stale references:

```bash
rm public/assets/img/<prefix>_*.png
```

---

## Step 5c — Crop to the figure panel (recommended for full-page screenshots)

A full-page screenshot usually contains the figure, its caption, and unrelated
margin. Cropping to just the figure panel makes the image much more readable at
the same width, and it resolves the "one page holds several figures" case (e.g.
Figures 6 and 7 both sitting on one page) so each figure gets its own clean
crop. Crop out the paper's caption — the Markdown adds its own caption.

**How to find the figure's position without viewing the image.** The model
cannot see the PNG, but the JSON parse exposes per-text-item coordinates. Locate
the *caption* text item `Figure N. …` and read its `y` (top edge) relative to the
page height; the figure panel sits directly above its caption:

```bash
# Extract caption coordinates from the JSON (pages are 0-indexed)
python -c "
import json, re
data = json.load(open('./tmp_shots/paper.json'))
for p in data['pages']:
    for ti in p.get('textItems', []):
        t = ti['text']
        if re.match(r'^Figure\s+\d+\.', t):   # period anchors on real captions only
            print(f'page {p.get(\"page\", \"?\")}: {t[:30]} y={ti[\"y\"]:.0f} x={ti[\"x\"]:.0f} w={ti[\"width\"]:.0f}')
"
```

Page height is about 842pt; at 150 DPI that is about 1754px (page width about
1240px). Use `p.get('height', 842)` when present. Convert caption position to
pixels: `caption_px = 1754 * (caption_y / 842)`.

Rules of thumb for the crop box:
- Caption near the **top** of the page → figure occupies a short strip above it.
- Caption near the **bottom** → tall crop covering most of the page.
- **Multiple captions on one page** → the caption `y` values mark the split
  points; crop each figure between adjacent captions.
- Cross-reference mentions ("Figure 5 plots…", "Figure 2b instantiates…") are
  body text, not captions — always match the trailing period after the number.

Convert caption pixels to crop percentages: `top% = 100 * (fig_top_y /
page_height)`, `height% = 100 * ((caption_y - fig_top_y) / page_height)`. Width
is typically the full text column (about 8–92%).

```bash
# Crop a page screenshot by pixel coordinates
bun scripts/crop-images.mjs <prefix>_<desc>.png <left> <top> <width> <height>

# Or by percentages (0-100), which is layout-independent and usually easier
bun scripts/crop-images.mjs <prefix>_<desc>.png 5 10 80 60 --pct --out <prefix>_<kind><N>_<desc>.png
```

The cropped result is saved as a new PNG (default `<name>_cropped.png`, or
whatever `--out` gives you). Delete the original uncropped PNG, then run Step 5b
to produce the WebP.

Crop after copying to `public/assets/img/` (the script reads and writes there).
Verify the crop by opening the PNG once: if it clips a panel edge or includes
caption/body text, adjust the box and re-run.

---

## Step 6 — Update markdown with image references

For each insertion point, insert right after the relevant paragraph:

```markdown
![Figure N: Short caption](/assets/img/<filename>.webp)

*Figure N shows [what this figure shows and why it matters].*
```

Paths must use `.webp` extension and `/assets/img/` (root-relative, served from
`public/assets/img/`). Keep the Markdown simple; do not hand-add `loading` or
width/height unless the figure needs a special layout.

---

## Step 6b — Verify before claiming done

```bash
bun run build
bun run test

# Every referenced image must exist
for p in $(grep -o '/assets/img/[^)]*' src/content/posts/<post-filename>.md | sort -u); do
  test -f "public$p" || echo "MISSING: $p"
done
```

`bun run build` validates frontmatter and compiles the site, but it does not
fail on a missing Markdown image path — run the loop. Check
`dist/posts/<slug>/index.html` contains each figure reference.

---

## Step 7 — Commit and push only the changed files

```bash
git add src/content/posts/<post-filename>.md public/assets/img/<filenames>
git commit -m "Add <paper> notes with <N> figure screenshots from the PDF"
git push
```

Only stage the post file and the new images. Do not stage `tmp_shots/`, source
PDFs, parsed files, or process-doc edits (those go in their own commit).

---

## Step 8 — Clean up temp files

The process leaves artifacts in `./tmp_shots` (`page_*.png`, `paper.txt`,
`paper.json`, previews). Delete the whole directory once the post is committed:

```bash
# Linux / macOS / Git Bash
rm -rf ./tmp_shots

# Windows (PowerShell)
Remove-Item -Recurse -Force .\tmp_shots -ErrorAction SilentlyContinue
```

Never commit parsed text/JSON files or page screenshots. Keep source PDFs in an
untracked working folder; keep only the post and the cropped `.webp` images in
the repo.
