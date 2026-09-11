import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicProfile } from "@/lib/api";
import { PublicArticleCard } from "@/components/public-article-card";

export const dynamic = "force-dynamic";

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "Profile not found" };
  const name = profile.user.name || profile.user.username || "Writer";
  return {
    title: `${name} — Articles`,
    description: `Articles by ${name} on Inkfeed.`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const displayName = profile.user.name || profile.user.username || "Anonymous";
  const handle = profile.user.username ? `@${profile.user.username}` : null;

  return (
    <main className="container-page py-16">
      <header className="flex flex-col gap-6 border-b border-hairline pb-12">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink text-heading-md font-medium text-white">
          {initials(displayName)}
        </span>
        <div>
          <h1 className="text-display-xl text-ink">{displayName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-md text-mute">
            {handle && <span className="font-mono">{handle}</span>}
            <span>·</span>
            <span>
              {profile.articles.length}{" "}
              {profile.articles.length === 1 ? "article" : "articles"}
            </span>
          </div>
        </div>
      </header>

      {profile.articles.length === 0 ? (
        <p className="py-28 text-center text-body-md text-mute">
          No published articles yet.{" "}
          <Link href="/explore" className="text-link">
            Explore others
          </Link>
          .
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-14 py-12 sm:grid-cols-2 lg:grid-cols-3">
          {profile.articles.map((article) => (
            <PublicArticleCard
              key={article.id}
              article={article}
              author={{
                username: profile.user.username,
                name: profile.user.name,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
