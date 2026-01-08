# AI Agent Onboarding Guide

## Project Overview
This is a static website/blog built with [Astro](https://astro.build) v5, using the "Terminal" theme (ported from Hugo). It uses TypeScript and Markdown for content.

## Quick Start
- **Package Manager**: npm
- **Development Server**: `npm run dev` (Runs locally)
- **Build**: `npm run build` (Builds for production)
- **Type Check**: `npm run check`

## Project Structure
- `src/content/posts/`: **Markdown content lives here.** This is where blog posts are stored.
- `src/pages/`: Astro file-based routing.
  - `index.astro`: Homepage.
  - `posts/[...slug].astro`: Dynamic route for individual posts.
- `src/layouts/`:
  - `BaseLayout.astro`: The main HTML shell (metadata, header, footer). Includes global CSS.
- `src/styles/`: Plain CSS files. Imported globally via `BaseLayout.astro`.
- `astro.config.mjs`: Project configuration. Note the `base` path logic for GitHub Pages.

## Content Management
To create a new blog post, add a `.md` file to `src/content/posts/`.

### Frontmatter Schema
Defined in `src/content.config.ts`.

```yaml
---
title: "My New Post"           # Required (string)
pubDate: 2023-10-27            # Required (date)
description: "Short summary"   # Optional (string)
author: "Name"                 # Optional (string)
tags: ["tag1", "tag2"]         # Optional (array of strings)
draft: false                   # Optional (boolean, default: false)
image: "/path/to/image.jpg"    # Optional (string)
---
```

## Styling
- **Method**: Global CSS files.
- **Location**: `src/styles/`.
- **Theme**: "Terminal" aesthetic. Key colors and variables are likely in `terminal.css` or `main.css`.
- **Modification**: To change styles, edit the CSS files in `src/styles/`. They are automatically injected into `BaseLayout.astro`.

## Technical Constraints & Notes
1.  **Base Path**: The site is configured to run on a subpath in production (`/astro-theme-terminal`).
    -   Use `import.meta.env.BASE_URL` when constructing internal links in components if not using Astro's standard `href`.
    -   The `BaseLayout` already handles some of this logic.
2.  **Images**: Public assets go in `public/`. Reference them as `/filename.png` (or with the base path prefix if hardcoding HTML).
3.  **Menu**: The navigation menu is defined in `BaseLayout.astro`. It is not dynamic (except for the mobile dropdown logic).

## Common Tasks
- **Add a Page**: Create a `.astro` file in `src/pages/`.
- **Update Menu**: Edit the `<header>` section in `src/layouts/BaseLayout.astro`.
- **Change Footer**: Edit the `<footer>` section in `src/layouts/BaseLayout.astro`.
