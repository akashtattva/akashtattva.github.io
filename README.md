# personal notes website

Astro 6 static site with the Terminal theme. Bun only.

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production (runs astro check first)
bun run build

# Run the build smoke test
bun run test

# Optimize new images only (incremental; pass a prefix)
bun run optimize-images <prefix>
```

## Deploy

The live site is `https://akashtattva.github.io`. A push to `main` triggers
`.github/workflows/deploy.yml`, which builds with `bun run build` and deploys to
GitHub Pages.

```bash
# See recent deploy runs
gh run list

# Watch the current run, or inspect a failure
gh run watch <run-id>
gh run view <run-id> --log-failed

# Confirm Pages is using the Actions workflow, not a legacy build
gh api repos/akashtattva/akashtattva.github.io/pages
```

A failed Pages build leaves the previous deployment live. Hard-refresh before
assuming the deploy failed. The workflow does not run `bun run test`.

## Project Structure

- `src/content/posts/`: Markdown posts. The filename is the URL slug.
- `src/pages/`: Astro file-based routing.
- `src/layouts/`: `BaseLayout`, `PageLayout`, `PostLayout`.
- `src/styles/`: global CSS files (Terminal theme).
- `public/assets/img/`: post figures (`.webp`).
- `CONTEXT.md`: module map and data flow.
- `AGENTS.md`: agent-facing map and conventions.

## Creating Content

Add a `.md` file to `src/content/posts/` named `YYYY-MM-DD-<slug>.md`. The
filename is the URL slug. Frontmatter starts with `title`, `pubDate`, and an
optional `description`; the full schema is in `src/content.config.ts`.

Start the body at `#` (h1). Do not add a
cover `image:` unless asked.

## Diagrams

Read `ATTACH-DIAGRAMS-PROCESS.md` before attaching paper figures. Figures are
`.webp` files in `public/assets/img/`, referenced as
`/assets/img/<name>.webp`.

## Configuration

- **Site Config**: `astro.config.mjs` (base is `/`).
- **Navigation**: edit both nav lists in `src/layouts/BaseLayout.astro`.
- **Styles**: see the styles map in `AGENTS.md`.
- **Deploy**: `.github/workflows/deploy.yml`.

## Generated files

`node_modules/`, `.astro/`, and `dist/` are generated. `gui-sock-*` files appear
only when WezTerm is running; they are safe to delete and are ignored by git.

## License

This project is based on the Astro Terminal Theme (MIT License).
