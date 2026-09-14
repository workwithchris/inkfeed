"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "./ui/confirm-dialog";
import {
  listArticles,
  listAllPublications,
  deleteArticle,
  type ArticleResponse,
  type PublicationResponse,
  type SourceType,
} from "@/lib/api";
import { SITE_PLATFORM_LABEL } from "@repo/types";
import { PlatformIcon } from "./platform-icon";

const PLATFORM_NAME: Record<string, string> = {
  devto: "Dev.to",
  hashnode: "Hashnode",
  blogger: "Blogger",
  site: SITE_PLATFORM_LABEL,
  webhook: "Webhook",
};

const SOURCE_LABEL: Record<SourceType, string> = {
  youtube: "YouTube",
  url: "Article",
  feed: "Podcast",
  document: "Document",
  manual: "Written",
};

function SourceIcon({
  type,
  className = "h-5 w-5",
}: {
  type: SourceType;
  className?: string;
}) {
  if (type === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  }

  const paths = {
    url: (
      <>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
      </>
    ),
    feed: (
      <>
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1.4" />
      </>
    ),
    document: (
      <>
        <path d="M14 3v5h5" />
        <path d="M6 3h8l5 5v13H6z" />
      </>
    ),
    manual: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
  }[type];

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths}
    </svg>
  );
}

function PublishedLinks({ items }: { items: PublicationResponse[] }) {
  if (!items.length) return null;
  return (
    <span className="hidden items-center gap-0.5 md:inline-flex">
      {items.map((p) => (
        <a
          key={p.id}
          href={p.externalUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          title={`Published on ${PLATFORM_NAME[p.platform] ?? p.platform}`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-mute transition-colors hover:bg-hairline-soft hover:text-ink"
        >
          <PlatformIcon platform={p.platform} className="h-3.5 w-3.5" />
        </a>
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string; pulse?: boolean }> = {
    COMPLETED: { dot: "bg-ink", label: "Ready" },
    FAILED: { dot: "bg-error", label: "Failed" },
    PENDING: { dot: "bg-faint", label: "Queued" },
    EXTRACTING: { dot: "bg-link", label: "Extracting", pulse: true },
    SYNTHESIZING: { dot: "bg-link", label: "Writing", pulse: true },
  };
  const s = map[status] ?? { dot: "bg-faint", label: status };

  return (
    <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-elevated px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-mute sm:inline-flex">
      <span
        className={`h-1.5 w-1.5 rounded-full ${s.dot} ${
          s.pulse ? "animate-pulse" : ""
        }`}
      />
      {s.label}
    </span>
  );
}

function displayTitle(article: ArticleResponse): string {
  const raw = article.title?.trim();
  if (raw && raw !== "Untitled Video") return raw;
  return article.sourceUrl || article.sourceItemUrl || "Untitled";
}

export function ArticleList() {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<ArticleResponse | null>(
    null,
  );
  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: listArticles,
    // Keep polling while any article is still being processed so the list
    // reflects completion without a manual refresh.
    refetchInterval: (query) => {
      const data = query.state.data as ArticleResponse[] | undefined;
      const inFlight = data?.some(
        (a) =>
          a.status === "PENDING" ||
          a.status === "EXTRACTING" ||
          a.status === "SYNTHESIZING",
      );
      return inFlight ? 3000 : false;
    },
  });

  const { data: allPublications } = useQuery({
    queryKey: ["publications"],
    queryFn: listAllPublications,
    refetchOnMount: "always",
  });

  const publishedByArticle = new Map<string, PublicationResponse[]>();
  for (const p of allPublications ?? []) {
    if (p.status !== "PUBLISHED") continue;
    const list = publishedByArticle.get(p.articleId) ?? [];
    list.push(p);
    publishedByArticle.set(p.articleId, list);
  }

  const deleteMutation = useMutation({
    mutationFn: deleteArticle,
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["publications"] });
    },
  });

  if (isLoading || !articles?.length) return null;

  const totalViews = articles.reduce((sum, a) => sum + (a.viewCount ?? 0), 0);
  const totalPublished = (allPublications ?? []).filter(
    (p) => p.status === "PUBLISHED",
  ).length;

  const stats = [
    { label: "Articles", value: articles.length },
    { label: "Views", value: totalViews },
    { label: "Published", value: totalPublished },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-hairline bg-elevated px-4 py-3"
          >
            <p className="eyebrow">{s.label}</p>
            <p className="mt-1 font-mono text-h3 text-ink">
              {s.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="eyebrow">Library</p>
        <span className="font-mono text-eyebrow text-faint">
          {articles.length} {articles.length === 1 ? "article" : "articles"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-elevated">
        {articles.map((article: ArticleResponse) => {
          const published = publishedByArticle.get(article.id) ?? [];
          return (
            <div
              key={article.id}
              className="group flex items-center gap-2 border-b border-hairline pr-2 transition-colors last:border-b-0 hover:bg-canvas"
            >
              <Link
                href={`/app/articles/${article.slug ?? article.id}`}
                className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-3"
              >
                <span className="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-hairline bg-canvas text-mute">
                  {article.coverImageUrl ? (
                    <img
                      src={article.coverImageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <SourceIcon type={article.sourceType} className="h-5 w-5" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-md font-medium text-ink">
                    {displayTitle(article)}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-body-sm text-faint">
                    <span className="text-mute">
                      {SOURCE_LABEL[article.sourceType] ?? article.sourceType}
                    </span>
                    {article.channel && (
                      <>
                        <span>·</span>
                        <span className="max-w-[18ch] truncate">
                          {article.channel}
                        </span>
                      </>
                    )}
                    {article.readingTimeMinutes ? (
                      <>
                        <span>·</span>
                        <span className="shrink-0">
                          {article.readingTimeMinutes} min
                        </span>
                      </>
                    ) : null}
                    {article.viewCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="shrink-0">
                          {article.viewCount.toLocaleString()}{" "}
                          {article.viewCount === 1 ? "view" : "views"}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span className="shrink-0">
                      {new Date(article.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                </span>
              </Link>

              <PublishedLinks items={published} />

              <StatusBadge status={article.status} />

              <button
                onClick={() => setPendingDelete(article)}
                disabled={deleteMutation.isPending}
                aria-label="Delete article"
                className="rounded-md p-2 text-faint opacity-0 transition-all hover:bg-hairline-soft hover:text-error focus:opacity-100 disabled:opacity-40 group-hover:opacity-100"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete this article?"
        description={
          pendingDelete
            ? `"${displayTitle(pendingDelete)}" will be permanently removed.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id);
        }}
      />
    </div>
  );
}
