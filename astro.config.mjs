// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://akashtattva.github.io',
  base: '/',
  markdown: {
    shikiConfig: {
      theme: 'css-variables',
      langs: [],
      wrap: true,
    },
  },
});
