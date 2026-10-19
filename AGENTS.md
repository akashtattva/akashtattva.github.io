# AI Agent Onboarding Guide

Astro 6 static site, bun. Production base is `/` (`astro.config.mjs`). Module map: `CONTEXT.md`.

## Quick Start

- **Install**: `bun install`
- **Dev**: `bun run dev`
- **Build**: `bun run build` (`astro check && astro build`)
- **Test**: `bun run test` (build smoke test; does not run `astro check`)
- **Type check**: `bun run check`

## Map — open only what the task needs

| Path | What lives there | Open when |
|---|---|---|
| `src/content/posts/` | `.md` posts; filename is the URL slug | adding/editing a post |
| `src/content.config.ts` | post frontmatter schema (SSOT) | changing metadata |
| `src/pages/posts/[...slug].astro` | post route, prev/next | post URLs/pagination |
| `src/pages/index.astro`, `src/pages/posts/index.astro` | home + post list | ordering/listing |
| `src/pages/tags/` | tag index + per-tag pages | tags |
| `src/pages/about.astro`, `lists.md`, `til.md` | standalone pages (both patterns) | adding a page |
| `src/layouts/BaseLayout.astro` | shell, **two** nav lists, footer, CSS imports | nav/footer/meta |
| `src/layouts/PostLayout.astro` | post chrome, title, optional cover | post presentation |
| `src/layouts/PageLayout.astro` | Markdown page wrapper | Markdown pages |
| `src/components/` | `PostCard`, `FormattedDate` | cards/dates |
| `src/lib/base-url.ts` | `baseUrl()` helper | internal links |
| `src/styles/` | 13 CSS files; map below | styling |
| `public/assets/img/` | `.webp` post figures | images |
| `public/fonts/` | font files | fonts |
| `scripts/optimize-images.mjs`, `scripts/crop-images.mjs` | image conversion/cropping | figures |
| `ATTACH-DIAGRAMS-PROCESS.md` | paper → figure pipeline | attaching diagrams |
| `.github/workflows/deploy.yml` | GitHub Pages build/deploy | deploy failures |
| `src/__tests__/build.test.ts` | build smoke test | verification |

## Post conventions

- Filename: `YYYY-MM-DD-<kebab-title>.md`. The filename without `.md` is the URL slug: `/posts/<filename>/`.
- `.md` only — no MDX. Schema: `src/content.config.ts` (there is no `src/content/config.ts`).
- Start the body at `#` (h1).
- No cover images on this site. Do not add `image:` unless explicitly asked.
- `draft: true` hides a post from lists, RSS, and the sitemap. `tags` auto-create `/tags/<tag>/`. Titles may contain inline HTML such as `<em>`.
- Do not copy frontmatter from another post; use the schema.

## Diagrams and images

- Read `ATTACH-DIAGRAMS-PROCESS.md` end to end before attaching figures.
- Figures live in `public/assets/img/` and are referenced as `/assets/img/<name>.webp`. PNGs are intermediates; delete them before committing.
- Convert only new images: `bun run optimize-images <prefix>`. The script is incremental and skips existing WebPs.

## Styles

- `terminal.css` — color tokens (`--background`, `--foreground`, `--accent`, around lines 143–149) and body font/@font-face.
- `fonts.css` — heading font (Fraunces) and heading rules.
- `main.css` — base layout; `post.css` — article body; the other files are component-specific.
- All are imported in `BaseLayout.astro` around lines 166–180; order matters. Use CSS variables, not raw colors.

## Deploy

- GitHub Pages via `.github/workflows/deploy.yml` on push to `main`; live at `https://akashtattva.github.io`.
- Check: `gh run list`, `gh run watch <run-id>`, `gh run view <run-id> --log-failed`.
- Check the Pages source/build type: `gh api repos/akashtattva/akashtattva.github.io/pages`.
- A failed Pages build leaves the previous deployment live. Hard-refresh before assuming the deploy failed.
- The workflow runs `bun run build`, not `bun run test`.

## Standalone pages

- `.astro` for layout-heavy pages; `.md` + `PageLayout` for prose.
- Update **both** nav lists in `BaseLayout.astro` (mobile and desktop), and add the path to `src/pages/sitemap.xml.js`.
- URLs use a trailing slash. Full recipe: `docs/ADD-PAGE.md`.

## Common tasks

- **Update menu**: edit both nav lists in `BaseLayout.astro`.
- **Change footer**: edit the `<footer>` section in `BaseLayout.astro`.
- **Add a post**: follow “Post conventions” above.
