import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPublicArticle } from "@/lib/api";
import { stripTldr } from "@/lib/content";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

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
  const canonical = `${SITE}/article/${article.slug ?? article.id}`;

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

  return (
    <main className="container-page py-16">
      <article className="mx-auto max-w-3xl">
        {article.coverImageUrl && (
          <img
            src={article.coverImageUrl}
            alt=""
            className="mb-8 aspect-video w-full rounded-lg border border-hairline object-cover"
          />
        )}

        <h1 className="text-display-xl text-ink">{article.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-mute">
          {article.channel && <span>{article.channel}</span>}
          {article.readingTimeMinutes && (
            <>
              <span>·</span>
              <span>{article.readingTimeMinutes} min read</span>
            </>
          )}
          <span>·</span>
          <span>
            {new Date(article.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {!!article.summary?.trim() && (
          <div className="mt-8 rounded-md border border-hairline bg-hairline-soft p-6">
            <p className="eyebrow text-ink">Summary</p>
            <p className="mt-3 text-body-lg text-ink">{article.summary}</p>
          </div>
        )}

        <div className="prose-article mt-10 max-w-none border-t border-hairline pt-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {stripTldr(article.content)}
          </ReactMarkdown>
        </div>

        {!!article.tags?.length && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-hairline pt-6">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-hairline-soft px-2 py-0.5 font-mono text-eyebrow text-body"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <p className="mt-8 text-body-sm text-faint">
          Generated from{" "}
          <a
            href={article.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            the source video
          </a>
          .
        </p>
      </article>
    </main>
  );
}
