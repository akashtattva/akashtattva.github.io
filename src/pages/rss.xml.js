import rss from '@astrojs/rss';
import { getPublishedPosts } from '../lib/posts';

const stripTags = (value = '') => String(value).replace(/<[^>]*>/g, '');

export async function GET(context) {
  const posts = await getPublishedPosts();
  const site = context.site ?? import.meta.env.SITE ?? 'http://localhost:4321';

  return rss({
    title: "Akash's Notes",
    description: 'Notes, essays, and links from Akash.',
    site,
    customData: '<language>en-us</language>',
    items: posts.map((post) => ({
      title: stripTags(post.data.title),
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/posts/${post.id}/`,
    })),
  });
}
