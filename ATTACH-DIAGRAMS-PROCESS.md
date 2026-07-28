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

The prebuild script (`scripts/optimize-images.mjs`) converts all PNGs in `public/assets/img/` to WebP automatically during `npm run build`. **Existing posts reference `.webp` files directly.**

```bash
# Generate WebP versions
npm run build
```

Or just the prebuild step:
```bash
node scripts/optimize-images.mjs
```

After conversion, delete the source PNGs to avoid stale references:
```bash
rm public/assets/img/<prefix>_*.png
```

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
