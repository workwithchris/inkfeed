"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listConnections,
  listPublications,
  publishArticle,
  unpublishArticleSite,
  cancelScheduledPublish,
  type ArticleResponse,
  type ConnectionResponse,
  type PublicationResponse,
  type PublishOptions,
} from "@/lib/api";
import { SITE_PLATFORM_LABEL } from "@repo/types";
import { PlatformIcon } from "./platform-icon";

type ImageMode = "keep" | "replace" | "none";

const IMAGE_MODES: { id: ImageMode; label: string }[] = [
  { id: "keep", label: "Keep" },
  { id: "replace", label: "Replace" },
  { id: "none", label: "Remove" },
];

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-faint",
  SCHEDULED: "bg-link",
  PUBLISHING: "bg-link",
  PUBLISHED: "bg-ink",
  FAILED: "bg-error",
};

function platformLabel(platform: PublicationResponse["platform"]): string {
  if (platform === "devto") return "Dev.to";
  if (platform === "hashnode") return "Hashnode";
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "github") return "GitHub";
  if (platform === "site") return SITE_PLATFORM_LABEL;
  if (platform === "webhook") return "Webhook";
  return "Blogger";
}

export function PublishDialog({ article }: { article: ArticleResponse }) {
  const articleId = article.id;
  const queryClient = useQueryClient();
  const [connectionId, setConnectionId] = useState("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState(article.title ?? "");
  const [imageMode, setImageMode] = useState<ImageMode>(
    article.coverImageUrl ? "keep" : "none",
  );
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

  const replaceInvalid = imageMode === "replace" && !coverImageUrl.trim();

  // Any chosen time schedules the publish; the API treats a past time as
  // "send now".
  const schedulesFuture = !!scheduleAt;

  const publishOptions = (): PublishOptions => ({
    includeCoverImage: imageMode !== "none",
    title: title.trim() || undefined,
    coverImageUrl:
      imageMode === "replace" ? coverImageUrl.trim() : undefined,
    scheduledFor: schedulesFuture
      ? new Date(scheduleAt).toISOString()
      : undefined,
  });

  const imagePreview =
    imageMode === "keep"
      ? article.coverImageUrl
      : imageMode === "replace"
        ? coverImageUrl.trim() || null
        : null;

  const { data: connections } = useQuery({
    queryKey: ["connections"],
    queryFn: listConnections,
  });

  // LinkedIn temporarily disabled until app credentials are configured.
  const publishableConnections = connections?.filter(
    (c) => c.platform !== "linkedin",
  );

  const { data: publications } = useQuery({
    queryKey: ["publications", articleId],
    queryFn: () => listPublications(articleId),
    refetchInterval: (query) => {
      const data = query.state.data as PublicationResponse[] | undefined;
      const inFlight = data?.some(
        (p) => p.status === "PENDING" || p.status === "PUBLISHING",
      );
      return inFlight ? 2000 : false;
    },
  });

  // Default to the first destination.
  useEffect(() => {
    if (connectionId || !connections?.length) return;
    const first = connections.find((c) => c.platform !== "linkedin");
    if (first) setConnectionId(first.id);
  }, [connections, connectionId]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["publications", articleId] });
    queryClient.invalidateQueries({ queryKey: ["publications"] });
  };

  const publishMutation = useMutation({
    mutationFn: () =>
      publishArticle(articleId, connectionId, publishOptions()),
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const publishAllMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        (publishableConnections ?? []).map((c) =>
          publishArticle(articleId, c.id, publishOptions()),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        throw new Error(
          `Queued ${results.length - failed} of ${results.length} destinations; ${failed} failed to start.`,
        );
      }
    },
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishArticleSite(articleId),
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (publicationId: string) =>
      cancelScheduledPublish(articleId, publicationId),
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const inFlight = publications?.some(
    (p) => p.status === "PENDING" || p.status === "PUBLISHING",
  );
  const lastFailed = publications?.find((p) => p.status === "FAILED");

  const selectedConnection = publishableConnections?.find(
    (c) => c.id === connectionId,
  );
  const selectedIsSite = selectedConnection?.platform === "site";
  const sitePublished = publications?.some(
    (p) => p.platform === "site" && p.status === "PUBLISHED",
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Publish</p>
        <Link
          href="/settings"
          className="text-body-sm text-mute transition-colors hover:text-ink"
        >
          Manage
        </Link>
      </div>

      {!publishableConnections?.length ? (
        <p className="text-body-sm text-mute">
          No destinations connected.{" "}
          <Link href="/settings" className="text-link">
            Connect one
          </Link>
          .
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            role="radiogroup"
            aria-label="Destination"
            className="flex flex-col gap-2"
          >
            {publishableConnections.map((c: ConnectionResponse) => {
              const selected = connectionId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setConnectionId(c.id)}
                  disabled={inFlight}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
                    selected
                      ? "border-ink bg-canvas"
                      : "border-hairline bg-elevated hover:bg-canvas"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-hairline bg-elevated text-ink">
                    <PlatformIcon platform={c.platform} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md font-medium text-ink">
                      {platformLabel(c.platform)}
                    </span>
                    <span className="block truncate text-body-sm text-faint">
                      {c.blogName || "Connected"}
                    </span>
                  </span>
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-ink bg-ink text-on-ink"
                        : "border-hairline"
                    }`}
                  >
                    {selected && (
                      <svg
                        className="h-2.5 w-2.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-hairline pt-4">
            <p className="eyebrow">Before you publish</p>

            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-mute">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Draft title"
                disabled={inFlight}
                className="input-default"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-body-sm text-mute">Cover image</span>
              <div
                role="radiogroup"
                aria-label="Cover image"
                className="flex gap-1 rounded-md border border-hairline bg-canvas p-1"
              >
                {IMAGE_MODES.filter(
                  (mode) => mode.id !== "keep" || !!article.coverImageUrl,
                ).map((mode) => {
                  const active = imageMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setImageMode(mode.id)}
                      disabled={inFlight}
                      className={`flex-1 rounded-sm px-2 py-1 text-button-md transition-colors ${
                        active
                          ? "bg-ink text-on-ink"
                          : "text-body hover:bg-elevated"
                      }`}
                    >
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              {imageMode === "replace" && (
                <input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://…/cover.jpg"
                  disabled={inFlight}
                  className="input-default"
                />
              )}

              {imagePreview && (
                <img
                  src={imagePreview}
                  alt=""
                  className="aspect-video w-full rounded-md border border-hairline object-cover"
                />
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm text-mute">
                Schedule for later{" "}
                <span className="text-faint">(optional)</span>
              </span>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                disabled={inFlight}
                className="input-default"
              />
            </label>
          </div>

          {selectedIsSite && sitePublished ? (
            <button
              onClick={() => unpublishMutation.mutate()}
              disabled={unpublishMutation.isPending || inFlight}
              className="btn-sm-ghost w-full"
            >
              {unpublishMutation.isPending
                ? "Unpublishing…"
                : `Unpublish from ${SITE_PLATFORM_LABEL}`}
            </button>
          ) : (
            <button
              onClick={() => publishMutation.mutate()}
              disabled={
                !connectionId ||
                replaceInvalid ||
                publishMutation.isPending ||
                inFlight
              }
              className="btn-sm-primary w-full"
            >
              {inFlight
                ? "Publishing…"
                : schedulesFuture
                  ? "Schedule"
                  : selectedIsSite
                    ? `Publish to ${SITE_PLATFORM_LABEL}`
                    : "Publish as draft"}
            </button>
          )}

          {publishableConnections.length > 1 && (
            <button
              onClick={() => publishAllMutation.mutate()}
              disabled={
                replaceInvalid ||
                publishAllMutation.isPending ||
                inFlight
              }
              className="btn-sm-ghost w-full"
            >
              {publishAllMutation.isPending
                ? "Queueing…"
                : `Publish to all (${publishableConnections.length})`}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-body-sm text-error">{error}</p>}
      {!error && lastFailed?.errorMessage && (
        <p className="text-body-sm text-error">{lastFailed.errorMessage}</p>
      )}

      {!!publications?.length && (
        <div className="flex flex-col gap-3 border-t border-hairline pt-4">
          <p className="eyebrow">History</p>
          <div className="flex flex-col">
            {publications.map((p: PublicationResponse) => (
              <div key={p.id} className="py-1.5">
                <div className="flex items-center gap-3 text-body-sm">
                  <PlatformIcon
                    platform={p.platform}
                    className="h-3.5 w-3.5 shrink-0 text-mute"
                  />
                  <span className="min-w-0 flex-1 truncate text-body">
                    {platformLabel(p.platform)}
                  </span>
                  {p.responseStatus != null && (
                    <span
                      className={`font-mono text-[11px] ${
                        p.responseStatus >= 200 && p.responseStatus < 300
                          ? "text-mute"
                          : "text-error"
                      }`}
                    >
                      HTTP {p.responseStatus}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-mono text-[11px] text-mute">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        STATUS_DOT[p.status] ?? "bg-faint"
                      }`}
                    />
                    {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                  </span>
                  {p.status === "SCHEDULED" && p.scheduledFor && (
                    <span className="font-mono text-[11px] text-link">
                      {new Date(p.scheduledFor).toLocaleString()}
                    </span>
                  )}
                  {p.status === "SCHEDULED" && (
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate(p.id)}
                      disabled={cancelMutation.isPending}
                      className="text-faint transition-colors hover:text-error"
                    >
                      Cancel
                    </button>
                  )}
                  {p.externalUrl && (
                    <a
                      href={p.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-faint transition-colors hover:text-ink"
                      aria-label="View draft"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M14 5h5v5M19 5l-8 8M19 14v5H5V5h5" />
                      </svg>
                    </a>
                  )}
                </div>
                {p.responseBody && (
                  <details className="mt-1 pl-6">
                    <summary className="cursor-pointer font-mono text-[11px] text-faint transition-colors hover:text-ink">
                      Response body
                    </summary>
                    <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-sm border border-hairline bg-canvas p-2 font-mono text-[11px] text-mute">
                      {p.responseBody}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
