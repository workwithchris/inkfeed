import { getPublicFeed } from "@/lib/api";
import { SITE_URL, articleUrl } from "@/lib/public-urls";
import { buildRssFeed } from "@/lib/rss";

export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await getPublicFeed({ limit: 50 });
  const xml = buildRssFeed({
    title: "Inkfeed — Explore",
    link: `${SITE_URL}/explore`,
    description: "The latest articles published on Inkfeed.",
    selfUrl: `${SITE_URL}/feed.xml`,
    items: feed.items.map((item) => ({
      title: item.title,
      link: articleUrl(item.authorUsername, item.slug ?? item.id),
      description: item.summary,
      pubDate: item.createdAt,
    })),
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
