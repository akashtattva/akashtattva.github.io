import { getCollection } from 'astro:content';

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET(context) {
  const posts = (await getCollection('posts'))
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const site = new URL(context.site ?? import.meta.env.SITE ?? 'http://localhost:4321');

  const items = posts.map((post) => {
    const link = new URL(`/posts/${post.id}/`, site).toString();
    return `
      <item>
        <title>${escapeXml(post.data.title)}</title>
        <link>${escapeXml(link)}</link>
        <guid>${escapeXml(link)}</guid>
        <pubDate>${post.data.pubDate.toUTCString()}</pubDate>
        ${post.data.description ? `<description>${escapeXml(post.data.description)}</description>` : ''}
      </item>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Akash's Notes</title>
    <description>Notes, essays, and links from Akash.</description>
    <link>${escapeXml(site.toString())}</link>
    <language>en-us</language>
    ${items.join('')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
