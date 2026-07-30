# personal notes website

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Optimize images (run manually when you add new images)
npm run optimize-images
```

This site deploys through GitHub Actions.

## Project Structure

- `src/content/posts/`: **Markdown content lives here.** This is where blog posts are stored.
- `src/pages/`: Astro file-based routing.
- `src/layouts/`: Main layouts like `BaseLayout.astro`.
- `src/styles/`: Global CSS files (Terminal theme).

## Creating Content

To create a new blog post, add a `.md` file to `src/content/posts/` with the following frontmatter:

```yaml
---
title: "My New Post"
pubDate: 2024-01-01
description: "Short summary"
author: "Your Name"
tags: ["tag1", "tag2"]
---
```

## Configuration

- **Site Config**: Edit `astro.config.mjs` to set your site URL.
- **Navigation**: Edit `src/layouts/BaseLayout.astro` to update the menu.
- **Styles**: Edit files in `src/styles/` to customize the look.

## License

This project is based on the Astro Terminal Theme (MIT License).
