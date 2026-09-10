"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createSseConnection,
  getArticle,
  listPublications,
  updateArticle,
  type ArticleResponse,
  type PublicationResponse,
} from "@/lib/api";
import { stripTldr } from "@/lib/content";
import { SeoPanel } from "./seo-panel";
import { PublishDialog } from "./publish-dialog";
import { PlatformIcon } from "./platform-icon";

const PLATFORM_NAME: Record<string, string> = {
  devto: "Dev.to",
  hashnode: "Hashnode",
  blogger: "Blogger",
};

function StatusPill({ status }: { status: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-elevated px-2.5 py-1 font-mono text-[11px] text-body">
      <span className="h-1.5 w-1.5 rounded-full bg-ink" />
      {label}
    </span>
  );
}

const STEPS = [
  { key: "EXTRACTING", label: "Extracting source" },
  { key: "SYNTHESIZING", label: "Writing article" },
];

export function ArticleDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [progress, setProgress] = useState("");

  const { data: article, isLoading } = useQuery({
    queryKey: ["article", id],
    queryFn: () => getArticle(id),
    refetchInterval: (query) => {
      const s = (query.state.data as ArticleResponse | undefined)?.status;
      return s === "COMPLETED" || s === "FAILED" ? false : 4000;
    },
  });

  const { data: publications } = useQuery({
    queryKey: ["publications", id],
    queryFn: () => listPublications(id),
  });
  const published = (publications ?? []).filter(
    (p) => p.status === "PUBLISHED" && p.externalUrl,
  );

  const handleEvent = useCallback(
    (event: unknown) => {
      const e = event as { type?: string; message?: string; error?: string };
      if (e.message) setProgress(e.message);
      if (e.type === "completed" || e.type === "failed") {
        queryClient.invalidateQueries({ queryKey: ["article", id] });
        queryClient.invalidateQueries({ queryKey: ["articles"] });
      }
    },
    [id, queryClient],
  );

  useEffect(() => {
    let disconnect = () => {};
    let cancelled = false;
    void (async () => {
      const token = await getToken().catch(() => null);
      if (cancelled) return;
      disconnect = createSseConnection(id, token, handleEvent);
    })();
    return () => {
      cancelled = true;
      disconnect();
    };
  }, [id, getToken, handleEvent]);

  const saveMutation = useMutation({
    mutationFn: () => updateArticle(id, { title, content }),
    onSuccess: (data) => {
      queryClient.setQueryData(["article", id], data);
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    if (!article) return;
    setTitle(article.title);
    setContent(article.content);
    setEditing(true);
  };

  if (isLoading || !article) {
    return (
      <div className="container-page py-16">
        <p className="text-body-md text-mute">Loading…</p>
      </div>
    );
  }

  const done = article.status === "COMPLETED";
  const failed = article.status === "FAILED";

  return (
    <main>
      {/* ─── Top bar ────────────────────────────────────────── */}
      <div className="border-b border-hairline">
        <div className="container-page flex h-14 items-center justify-between">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-body-md text-body transition-colors hover:text-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Workspace
          </Link>
          <StatusPill status={article.status} />
        </div>
      </div>

      <div className="container-page py-10">
        {done ? (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main column */}
            <div className="min-w-0">
              <p className="eyebrow">Article</p>
              {!editing && article.coverImageUrl && (
                <img
                  src={article.coverImageUrl}
                  alt=""
                  className="mt-4 aspect-video w-full rounded-lg border border-hairline object-cover"
                />
              )}
              {editing ? (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-default mt-4 text-heading-md"
                />
              ) : (
                <h1 className="mt-3 text-display-xl text-ink">
                  {article.title?.trim() && article.title !== "Untitled Video"
                    ? article.title
                    : "Untitled"}
                </h1>
              )}

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

              {!!published.length && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="eyebrow">Published</span>
                  {published.map((p: PublicationResponse) => (
                    <a
                      key={p.id}
                      href={p.externalUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-hairline bg-elevated px-3 py-1 text-body-sm text-ink transition-colors hover:bg-canvas"
                    >
                      <PlatformIcon
                        platform={p.platform}
                        className="h-3.5 w-3.5"
                      />
                      {PLATFORM_NAME[p.platform] ?? p.platform}
                      <svg
                        className="h-3 w-3 text-mute"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M14 5h5v5M19 5l-8 8M19 14v5H5V5h5" />
                      </svg>
                    </a>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex items-center gap-2">
                {editing ? (
                  <>
                    <button
                      onClick={() => setEditing(false)}
                      className="btn-sm-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                      className="btn-sm-primary"
                    >
                      {saveMutation.isPending ? "Saving…" : "Save changes"}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={startEdit} className="btn-sm-ghost">
                      Edit
                    </button>
                    <a
                      href={`/article/${article.slug ?? article.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-sm-ghost"
                    >
                      View public
                    </a>
                    <button
                      onClick={() => router.push("/app")}
                      className="btn-sm-ghost"
                    >
                      Convert another
                    </button>
                  </>
                )}
              </div>

              {!editing && !!article.summary?.trim() && (
                <div className="mt-8 rounded-md border border-hairline bg-hairline-soft p-6">
                  <p className="eyebrow text-ink">Summary</p>
                  <p className="mt-3 text-body-lg text-ink">{article.summary}</p>
                </div>
              )}

              {editing ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input-default mt-8 min-h-[560px] font-mono text-[13px] leading-6"
                />
              ) : (
                <article className="prose-article mt-10 max-w-none border-t border-hairline pt-10">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {stripTldr(article.content)}
                  </ReactMarkdown>
                </article>
              )}

              {!editing && <SeoPanel article={article} />}
            </div>

            {/* Sidebar */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
              <PublishDialog articleId={article.id} />

              <div className="card">
                <p className="eyebrow">Details</p>
                <dl className="mt-4 divide-y divide-hairline text-body-sm">
                  <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-mute">Model</dt>
                    <dd className="truncate text-ink">
                      {article.aiModel || "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-mute">Reading time</dt>
                    <dd className="text-ink">
                      {article.readingTimeMinutes
                        ? `${article.readingTimeMinutes} min`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                    <dt className="text-mute">Source</dt>
                    <dd className="truncate text-ink">
                      {article.channel || "Video"}
                    </dd>
                  </div>
                </dl>
              </div>
            </aside>
          </div>
        ) : failed ? (
          <div className="mx-auto max-w-lg py-16 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-error/20 bg-canvas text-error">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </span>
            <h1 className="mt-4 text-heading-md text-ink">
              Generation failed
            </h1>
            <p className="mt-2 text-body-md text-mute">
              {article.errorMessage || "Something went wrong."}
            </p>
            <Link href="/app" className="btn-secondary mt-6">
              Back to workspace
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-lg py-16">
            <p className="eyebrow">Processing</p>
            <h1 className="mt-3 text-heading-md text-ink">
              Writing your article
            </h1>
            <div className="mt-8 flex flex-col gap-4">
              {STEPS.map((step, i) => {
                const currentIndex = STEPS.findIndex(
                  (s) => s.key === article.status,
                );
                const complete = currentIndex > i;
                const current = currentIndex === i;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] ${
                        complete
                          ? "bg-ink text-white"
                          : current
                            ? "border-2 border-ink text-ink"
                            : "border border-hairline text-faint"
                      }`}
                    >
                      {complete ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-body-md ${
                        current
                          ? "font-medium text-ink"
                          : complete
                            ? "text-mute"
                            : "text-faint"
                      }`}
                    >
                      {step.label}
                    </span>
                    {current && (
                      <svg className="ml-auto h-4 w-4 animate-spin text-ink" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
            {progress && (
              <p className="mt-6 text-body-sm text-faint">{progress}</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
