# Add a standalone page

Standalone pages live in `src/pages/` and are separate from blog posts.

## Choose the format

- **Prose page** — use Markdown plus `PageLayout`.
- **Layout-heavy page** — use `.astro` plus `BaseLayout`.

## Markdown page

Create `src/pages/<slug>.md`:

```markdown
---
layout: ../layouts/PageLayout.astro
title: My Page
description: A short description
---

Page content starts here.
```

## Astro page

Create `src/pages/<slug>.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---

<BaseLayout title="My Page" description="A short description">
  <div class="page">
    <h1>My Page</h1>
    <p>Page content starts here.</p>
  </div>
</BaseLayout>
```

Use the existing `src/pages/about.astro` as the reference for the `.page`
wrapper.

## Register the page

1. Add the link to **both** nav lists in `src/layouts/BaseLayout.astro`:
   - mobile dropdown (around lines 66–77)
   - desktop nav (around lines 80–88)
2. Add the path to `staticPaths` in `src/pages/sitemap.xml.js` (around line 25).
3. Use a trailing slash in links: `/<slug>/`.

## Verify

```bash
bun run build
```

Check `dist/<slug>/index.html` exists and the link appears in both desktop and
mobile navigation.
