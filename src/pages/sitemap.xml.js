import { getCollection } from 'astro:content';

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function absoluteUrl(path, site) {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(`${base}${normalizedPath}`, site).toString();
}

export async function GET(context) {
  const posts = (await getCollection('posts'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const site = new URL(context.site ?? import.meta.env.SITE ?? 'http://localhost:4321');
  const tags = [...new Set(posts.flatMap((post) => post.data.tags))].sort();
  const staticPaths = ['/', '/about/', '/lists/', '/posts/', '/tags/', '/til/'];
  const postPaths = posts.map((post) => `/posts/${post.id}/`);
  const tagPaths = tags.map((tag) => `/tags/${tag}/`);
  const urls = [...staticPaths, ...postPaths, ...tagPaths];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escapeXml(absoluteUrl(url, site))}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
