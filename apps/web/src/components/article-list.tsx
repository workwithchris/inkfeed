"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listArticles,
  listAllPublications,
  deleteArticle,
  type ArticleResponse,
  type PublicationResponse,
} from "@/lib/api";
import { PlatformIcon } from "./platform-icon";

const PLATFORM_NAME: Record<string, string> = {
  devto: "Dev.to",
  hashnode: "Hashnode",
  blogger: "Blogger",
};

function PublishedLinks({ items }: { items: PublicationResponse[] }) {
  if (!items.length) return null;
  return (
    <span className="hidden items-center gap-1 md:inline-flex">
      {items.map((p) => (
        <a
          key={p.id}
          href={p.externalUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          title={`Published on ${PLATFORM_NAME[p.platform] ?? p.platform}`}
          className="flex h-6 w-6 items-center justify-center rounded-sm text-mute transition-colors hover:bg-hairline-soft hover:text-ink"
        >
          <PlatformIcon platform={p.platform} className="h-3.5 w-3.5" />
        </a>
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const dots: Record<string, string> = {
    COMPLETED: "bg-ink",
    FAILED: "bg-error",
    PENDING: "bg-faint",
    EXTRACTING: "bg-link",
    SYNTHESIZING: "bg-link",
  };

  return (
    <span className="hidden items-center gap-2 font-mono text-eyebrow text-mute sm:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status] ?? "bg-faint"}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function displayTitle(article: ArticleResponse): string {
  const raw = article.title?.trim();
  return raw && raw !== "Untitled Video" ? raw : article.youtubeUrl;
}

export function ArticleList() {
  const queryClient = useQueryClient();
  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: listArticles,
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
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["publications"] });
    },
  });

  if (isLoading || !articles?.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Recent</p>
        <span className="font-mono text-eyebrow text-faint">
          {articles.length} {articles.length === 1 ? "article" : "articles"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-elevated">
        {articles.map((article: ArticleResponse) => (
          <div
            key={article.id}
            className="group flex items-center gap-2 border-b border-hairline pr-2 transition-colors last:border-b-0 hover:bg-canvas"
          >
            <Link
              href={`/app/articles/${article.id}`}
              className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-mute transition-colors group-hover:text-ink">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-md font-medium text-ink">
                  {displayTitle(article)}
                </span>
                <span className="mt-1 flex items-center gap-2 font-mono text-body-sm text-faint">
                  {article.channel && (
                    <>
                      <span className="truncate">{article.channel}</span>
                      <span>·</span>
                    </>
                  )}
                  <span className="shrink-0">
                    {new Date(article.createdAt).toLocaleDateString()}
                  </span>
                </span>
              </span>
            </Link>

            <PublishedLinks items={publishedByArticle.get(article.id) ?? []} />

            <StatusBadge status={article.status} />

            <button
              onClick={() => {
                if (!window.confirm("Delete this article?")) return;
                deleteMutation.mutate(article.id);
              }}
              disabled={deleteMutation.isPending}
              aria-label="Delete article"
              className="rounded-sm p-2 text-faint transition-colors hover:bg-hairline-soft hover:text-error disabled:opacity-40"
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
        ))}
      </div>
    </div>
  );
}
