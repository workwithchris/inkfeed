import { getPublicProfile } from "@/lib/api";
import { SITE_URL, articleUrl, profileUrl } from "@/lib/public-urls";
import { buildRssFeed } from "@/lib/rss";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return new Response("Not found", { status: 404 });

  const name = profile.user.name || profile.user.username || "Writer";
  const xml = buildRssFeed({
    title: `${name} — Articles`,
    link: profileUrl(username),
    description: `Articles by ${name} on Inkfeed.`,
    selfUrl: `${SITE_URL}/u/${username}/rss.xml`,
    items: profile.articles.map((article) => ({
      title: article.title,
      link: articleUrl(profile.user.username, article.slug ?? article.id),
      description: article.summary,
      pubDate: article.createdAt,
    })),
  });

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
