// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';

/** Lazy-load post images, but let the first image load immediately. */
function rehypeLazyImages() {
  return (
    /** @param {import('hast').Root} tree */
    (tree) => {
      let imageIndex = 0;

      /** @param {import('hast').Nodes} node */
      const walk = (node) => {
        if (node.type === 'element' && node.tagName === 'img') {
          const properties = node.properties ?? (node.properties = {});
          properties.decoding = 'async';

          if (imageIndex === 0) {
            properties.loading = 'eager';
            properties.fetchPriority = 'high';
          } else {
            properties.loading = 'lazy';
          }

          imageIndex += 1;
        }

        if ('children' in node) {
          node.children.forEach(walk);
        }
      };

      walk(tree);
    }
  );
}

// https://astro.build/config
export default defineConfig({
  site: 'https://akashtattva.github.io',
  base: '/',
  integrations: [sitemap()],
  markdown: {
    processor: unified({ rehypePlugins: [rehypeLazyImages] }),
    shikiConfig: {
      theme: 'css-variables',
      langs: [],
      wrap: true,
    },
  },
});
