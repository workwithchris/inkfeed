import Link from "next/link";

const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN || "").replace(
  /^\.+|\.+$/g,
  "",
);
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

function baseProtocol(): string {
  try {
    return new URL(SITE).protocol.replace(":", "");
  } catch {
    return "https";
  }
}

function authorUrl(username: string): string {
  return APP_DOMAIN
    ? `${baseProtocol()}://${username}.${APP_DOMAIN}/`
    : `/u/${username}`;
}

function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export interface PublicArticleCardData {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  coverImageUrl: string | null;
  tags: string[] | null;
  readingTimeMinutes: number | null;
  createdAt: string;
}

export function PublicArticleCard({
  article,
  author,
}: {
  article: PublicArticleCardData;
  author?: { username: string | null; name: string | null } | null;
}) {
  const href = article.slug
    ? `/article/${article.slug}`
    : `/article/${article.id}`;
  const hasAuthor = Boolean(author?.name || author?.username);

  return (
    <article className="group flex flex-col">
      <Link href={href} className="flex flex-col gap-4">
        {article.coverImageUrl ? (
          <img
            src={article.coverImageUrl}
            alt=""
            loading="lazy"
            className="aspect-video w-full rounded-lg border border-hairline object-cover"
          />
        ) : (
          <div className="aspect-video w-full rounded-lg border border-hairline bg-hairline-soft" />
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-[0.08em] text-faint">
            {article.tags?.[0] && <span>{article.tags[0]}</span>}
            {article.tags?.[0] && article.readingTimeMinutes && <span>·</span>}
            {article.readingTimeMinutes && (
              <span>{article.readingTimeMinutes} min read</span>
            )}
          </div>
          <h3 className="text-heading-md text-ink transition-colors group-hover:text-body">
            {article.title}
          </h3>
          {article.summary && (
            <p className="line-clamp-3 text-body-md text-body">
              {article.summary}
            </p>
          )}
        </div>
      </Link>

      {hasAuthor && (
        <div className="mt-4 flex items-center gap-2 text-body-sm text-mute">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-[10px] font-medium text-white">
            {initials(author?.name || author?.username || "?")}
          </span>
          {author?.username ? (
            <a
              href={authorUrl(author.username)}
              className="transition-colors hover:text-ink"
            >
              {author.name || `@${author.username}`}
            </a>
          ) : (
            <span>{author?.name}</span>
          )}
          <span className="text-faint">·</span>
          <span className="text-faint">
            {new Date(article.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      )}
    </article>
  );
}
