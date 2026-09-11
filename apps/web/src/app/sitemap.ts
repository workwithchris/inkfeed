import type { MetadataRoute } from "next";
import { getPublicFeed } from "@/lib/api";
import { SITE_URL, articleUrl } from "@/lib/public-urls";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const limit = 50;
  for (let offset = 0; ; offset += limit) {
    const feed = await getPublicFeed({ limit, offset });
    for (const item of feed.items) {
      entries.push({
        url: articleUrl(item.authorUsername, item.slug ?? item.id),
        lastModified: item.createdAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    if (feed.items.length === 0 || offset + limit >= feed.total) break;
  }

  return entries;
}
