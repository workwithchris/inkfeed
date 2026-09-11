import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPublicArticle } from "@/lib/api";
import { stripTldr } from "@/lib/content";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN || "").replace(
  /^\.+|\.+$/g,
  "",
);

function baseProtocol(): string {
  try {
    return new URL(SITE).protocol.replace(":", "");
  } catch {
    return "https";
  }
}

function articleCanonical(username: string | null, slugOrId: string): string {
  if (username && APP_DOMAIN) {
    return `${baseProtocol()}://${username}.${APP_DOMAIN}/article/${slugOrId}`;
  }
  return `${SITE}/article/${slugOrId}`;
}

function profileUrl(username: string): string {
  if (APP_DOMAIN) {
    return `${baseProtocol()}://${username}.${APP_DOMAIN}/`;
  }
  return `${SITE}/u/${username}`;
}

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
  params: Promise<{ slugOrId: string }>;
}): Promise<Metadata> {
  const { slugOrId } = await params;
  const article = await getPublicArticle(slugOrId);
  if (!article) return { title: "Article not found" };

  const title = article.metaTitle ?? article.title;
  const description =
    article.metaDescription ?? article.summary ?? undefined;
  const canonical = articleCanonical(
    article.authorUsername,
    article.slug ?? article.id,
  );

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonical,
      images: article.coverImageUrl
        ? [{ url: article.coverImageUrl }]
        : undefined,
    },
  };
}

export default async function PublicArticlePage({
  params,
}: {
  params: Promise<{ slugOrId: string }>;
}) {
  const { slugOrId } = await params;
  const article = await getPublicArticle(slugOrId);
  if (!article) notFound();

  const sourceHref =
    article.sourceType === "youtube"
      ? article.youtubeUrl
      : (article.sourceItemUrl ?? article.sourceUrl);
  const authorLabel =
    article.authorName || (article.authorUsername ? `@${article.authorUsername}` : null);

  return (
    <main className="container-page py-16">
      <article className="mx-auto max-w-2xl">
        {article.tags?.[0] && (
          <p className="eyebrow mb-4">{article.tags[0]}</p>
        )}

        <h1 className="text-display-xl text-ink">{article.title}</h1>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-hairline pb-8">
          {authorLabel && (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-white">
                {initials(authorLabel)}
              </span>
              <span className="text-body-md text-ink">
                {article.authorUsername ? (
                  <a
                    href={profileUrl(article.authorUsername)}
                    className="transition-colors hover:text-link"
                  >
                    {authorLabel}
                  </a>
                ) : (
                  authorLabel
                )}
              </span>
              <span className="text-faint">·</span>
            </>
          )}
          <span className="text-body-sm text-mute">
            {new Date(article.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          {article.readingTimeMinutes && (
            <>
              <span className="text-faint">·</span>
              <span className="text-body-sm text-mute">
                {article.readingTimeMinutes} min read
              </span>
            </>
          )}
        </div>

        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt=""
            className="mt-10 aspect-video w-full rounded-lg border border-hairline object-cover"
          />
        )}

        {!!article.summary?.trim() && (
          <div className="mt-10 border-l-2 border-ink pl-5">
            <p className="eyebrow text-ink">Summary</p>
            <p className="mt-2 text-body-lg text-ink">{article.summary}</p>
          </div>
        )}

        <div className="prose-article mt-10 max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {stripTldr(article.content)}
          </ReactMarkdown>
        </div>

        {!!article.tags?.length && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-hairline pt-6">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-hairline bg-elevated px-3 py-1 text-body-sm text-body"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {sourceHref && (
          <p className="mt-8 text-body-sm text-faint">
            Generated from{" "}
            <a
              href={sourceHref}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              {article.sourceType === "youtube"
                ? "the source video"
                : "the source"}
            </a>
            .
          </p>
        )}
      </article>
    </main>
  );
}
