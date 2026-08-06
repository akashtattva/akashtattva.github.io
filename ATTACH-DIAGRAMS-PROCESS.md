# Process: Attach Paper Diagrams to Blog Notes

## Step 1 — Read the markdown notes

```bash
# Read the post to understand sections and find insertion points
cat src/content/posts/<post-filename>.md
```

Identify each section heading and decide which diagram fits where.

---

## Step 2 — Parse the PDF to find figures, (if the parsed file is provided, then no need to parse again and waste user's time and tokens.)

```bash
# Parse to text to find figure captions
lit parse "src/content/posts/<pdf-filename>.pdf" --format text --no-ocr -o /tmp/paper.txt

# Search for figure/table captions
grep -n -i -C2 "^figure \d\|^table \d\|^algorithm \d" /tmp/paper.txt
```

```bash
# Parse to JSON to get page numbers for each figure
lit parse "src/content/posts/<pdf-filename>.pdf" --format json --no-ocr -o /tmp/paper.json

# Find which pages contain which figures
python -c "
import json, re
with open('/tmp/paper.json') as f:
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

---

## Step 4 — Extract screenshots

```bash
# Take low-DPI screenshots of the relevant pages only
lit screenshot "src/content/posts/<pdf-filename>.pdf" \
  --target-pages "<page-nums>" --dpi 150 -o /tmp/shots/
```

Use 150 DPI. Only screenshot pages that contain the key figures.

---

## Step 5 — Copy assets to public/

```bash
# Copy with descriptive names
cp /tmp/shots/page_N.png public/assets/img/<prefix>_<description>.png
```

Naming convention: `<prefix>_fig<N>_<short-description>.png`

Prefix conventions used so far:
- `fig` — SDPO paper
- `opsd_fig` — OPSD paper
- `popsd_fig` — Purified OPSD paper

---

## Step 5b — Convert PNGs to WebP

The prebuild script (`scripts/optimize-images.mjs`) converts PNGs in `public/assets/img/` to WebP. **Existing posts reference `.webp` files directly.** It is incremental: it skips any image whose `.webp` already exists and is at least as new as the source, so re-running does not re-convert unchanged images.

```bash
# Convert only your new images (recommended — pass your prefix filter)
node scripts/optimize-images.mjs <prefix>

# Or convert everything (unchanged images are skipped anyway)
node scripts/optimize-images.mjs
```

Resolution overrides — use when an 800px-wide WebP is too small to read a dense figure (e.g. a multi-column table or a full-page screenshot):

```bash
node scripts/optimize-images.mjs <prefix> --max-width=1200 --quality=85
```

The default is 800px at quality 80. Existing posts keep using 800px; only raise it when the figure is genuinely unreadable, since bigger images cost page weight.

After conversion, delete the source PNGs to avoid stale references:
```bash
rm public/assets/img/<prefix>_*.png
```

---

## Step 5c — Crop to the figure panel (recommended for full-page screenshots)

A full-page screenshot usually contains the figure, its caption, and a lot of unrelated margin. Cropping to just the figure panel makes the image much more readable at the same width, and it also resolves the "one page holds several figures" case (e.g. Figures 6 and 7 both sitting on one page) so each figure gets its own clean crop.

**How to find the figure's position without viewing the image.** The model cannot see the PNG, but the JSON parse exposes per-text-item coordinates. Locate the *caption* text item `Figure N. …` and read its `y` (top edge) relative to the page height; the figure panel sits directly above its caption, so that position tells you where to crop:

```bash
# Extract caption coordinates from the JSON (pages are 0-indexed)
python -c "
import json, re
data = json.load(open('/tmp/paper.json'))
for p in data['pages']:
    for ti in p['textItems']:
        t = ti['text']
        if re.match(r'^Figure\s+\d+\.', t):   # period anchors on real captions only
            print(f'page {p[\"page\"]}: {t[:30]} y={ti[\"y\"]:.0f} x={ti[\"x\"]:.0f} w={ti[\"width\"]:.0f}')
"
```

Rules of thumb for the crop box (page height ≈ 842pt at 150 DPI):
- Caption near the **top** of the page → figure occupies roughly the upper 20–60% of the page.
- Caption near the **bottom** → figure occupies roughly the region above it (e.g. top edge ≈ 10–15%, bottom edge ≈ caption y).
- **Multiple captions on one page** → the caption `y` values mark the split points; crop each figure between the caption above it and the caption below it.
- Cross-reference mentions ("Figure 5 plots…", "Figure 2b instantiates…") are body text, not captions — always match the trailing period after the number.

Convert caption pixels to crop percentages: `top% = 100 * (fig_top_y / page_height)`, `height% = 100 * ((caption_y - fig_top_y) / page_height)`. Width is typically the full text column (about 8–92%).

```bash
# Crop a page screenshot by pixel coordinates
node scripts/crop-images.mjs <prefix>_<desc>.png <left> <top> <width> <height>

# Or by percentages (0-100), which is layout-independent and usually easier
node scripts/crop-images.mjs <prefix>_<desc>.png 5 10 80 60 --pct --out <prefix>_fig<N>_<desc>.png
```

The cropped result is saved as a new PNG (default `<name>_cropped.png`, or whatever `--out` gives you). Delete the original uncropped PNG, then run Step 5b to produce the WebP.

Crop after copying to `public/assets/img/` (the script reads and writes there). Verify the coordinates by opening the PNG once, or measure against the screenshot dimensions reported by `lit screenshot`.

---

## Step 6 — Update markdown with image references

For each insertion point, insert right after the relevant paragraph:

```markdown
![Figure N: Short caption](/assets/img/<filename>.webp)

*Figure N shows [what this figure shows and why it matters].*
```

Paths must use `.webp` extension and `/assets/img/` (root-relative, served from `public/assets/img/`).

---

## Step 7 — Commit and push only the changed files

```bash
git add src/content/posts/<post-filename>.md public/assets/img/<filenames>
git commit -m "Add <paper> notes with <N> figure screenshots from the PDF"
git push
```

Only stage the post file and the new images. Do not stage unrelated changes.

---

## Step 8 — Clean up temp files

The process leaves artifacts in the temp directory (`/tmp/shots`, `/tmp/paper.txt`, `/tmp/paper.json`). Clean them up once the post is committed:

```bash
# Linux / macOS
rm -rf /tmp/shots /tmp/paper.txt /tmp/paper.json

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:TEMP\opencode\ch_shots", "$env:TEMP\opencode\ch.json" -ErrorAction SilentlyContinue
```

Also delete the parsed text/JSON files if you created them inside the repo (they should not be committed). Keep only the original PDF, the notes post, and the cropped `.webp` images in the repo.
