import type { Metadata } from "next";
import Link from "next/link";
import { getPublicFeed } from "@/lib/api";
import { SITE_URL } from "@/lib/public-urls";
import { PublicArticleCard } from "@/components/public-article-card";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Explore",
  description: "Read the latest articles published on Inkfeed.",
  alternates: {
    types: { "application/rss+xml": `${SITE_URL}/feed.xml` },
  },
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; offset?: string }>;
}) {
  const { tag, offset } = await searchParams;
  const parsedOffset = parseInt(offset ?? "0", 10);
  const currentOffset = Number.isFinite(parsedOffset)
    ? Math.max(parsedOffset, 0)
    : 0;

  const feed = await getPublicFeed({
    limit: PAGE_SIZE,
    offset: currentOffset,
    tag: tag?.trim() || undefined,
  });

  const hasPrev = currentOffset > 0;
  const hasNext = currentOffset + PAGE_SIZE < feed.total;
  const querySuffix = tag ? `&tag=${encodeURIComponent(tag)}` : "";

  return (
    <main className="container-page py-16">
      <header className="flex flex-col gap-5 border-b border-hairline pb-12">
        <p className="eyebrow">Explore</p>
        <h1 className="max-w-3xl text-display-xl text-ink">
          The latest from Inkfeed.
        </h1>
        <p className="max-w-xl text-body-lg">
          Articles generated from videos, links, feeds, and documents — and
          published by their authors.
        </p>
        {tag && (
          <p className="text-body-sm text-mute">
            Filtering by <span className="font-mono text-ink">{tag}</span>
            {" · "}
            <Link href="/explore" className="text-link">
              clear
            </Link>
          </p>
        )}
      </header>

      {feed.items.length === 0 ? (
        <p className="py-28 text-center text-body-md text-mute">
          Nothing published here yet.{" "}
          <Link href="/app" className="text-link">
            Be the first
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-14 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {feed.items.map((item) => (
            <PublicArticleCard
              key={item.id}
              article={item}
              author={{
                username: item.authorUsername,
                name: item.authorName,
                imageUrl: item.authorImageUrl,
              }}
            />
          ))}
        </div>
      )}

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between border-t border-hairline pt-6">
          {hasPrev ? (
            <Link
              href={`/explore?offset=${Math.max(currentOffset - PAGE_SIZE, 0)}${querySuffix}`}
              className="btn-sm-ghost"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-eyebrow text-faint">
            {currentOffset + 1}–
            {Math.min(currentOffset + PAGE_SIZE, feed.total)} of {feed.total}
          </span>
          {hasNext ? (
            <Link
              href={`/explore?offset=${currentOffset + PAGE_SIZE}${querySuffix}`}
              className="btn-sm-ghost"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </main>
  );
}
