"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createDerivative,
  deleteDerivative,
  listDerivatives,
  updateDerivative,
  type DerivativeKind,
  type DerivativeResponse,
} from "@/lib/api";
import { firstTweet, tweetIntentUrl } from "@/lib/share";

const KINDS: { id: DerivativeKind; label: string; hint: string }[] = [
  { id: "tweet_thread", label: "Tweet thread", hint: "8-12 post thread" },
  { id: "newsletter", label: "Newsletter", hint: "Email issue" },
  { id: "video_script", label: "Video script", hint: "Script with cues" },
];

const STATUS_LABEL: Record<DerivativeResponse["status"], string> = {
  PENDING: "Queued",
  SYNTHESIZING: "Generating…",
  COMPLETED: "Ready",
  FAILED: "Failed",
};

function downloadFile(filename: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DerivativePanel({ articleId }: { articleId: string }) {
  const queryClient = useQueryClient();
  const [activeKind, setActiveKind] = useState<DerivativeKind>("tweet_thread");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const { data: derivatives, isLoading } = useQuery({
    queryKey: ["derivatives", articleId],
    queryFn: () => listDerivatives(articleId),
    refetchInterval: (query) => {
      const data = query.state.data as DerivativeResponse[] | undefined;
      const inFlight = data?.some(
        (d) => d.status === "PENDING" || d.status === "SYNTHESIZING",
      );
      return inFlight ? 3000 : false;
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["derivatives", articleId] });

  const createMutation = useMutation({
    mutationFn: (kind: DerivativeKind) => createDerivative(articleId, kind),
    onSuccess: () => {
      setError("");
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteDerivative(articleId, id),
    onSuccess: () => invalidate(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateDerivative(articleId, id, content),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const copy = async (derivative: DerivativeResponse) => {
    if (!derivative.content) return;
    try {
      await navigator.clipboard.writeText(derivative.content);
      setCopiedId(derivative.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Could not copy to clipboard");
    }
  };

  const meta = KINDS.find((k) => k.id === activeKind)!;
  const items = (derivatives ?? []).filter((d) => d.kind === activeKind);
  const generating = createMutation.isPending;

  return (
    <section className="card mt-10 flex flex-col gap-5">
      <div>
        <p className="eyebrow">Repurpose</p>
        <p className="mt-1 text-body-sm text-mute">
          Turn this article into other formats.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Format"
        className="flex gap-1 rounded-md border border-hairline bg-canvas p-1"
      >
        {KINDS.map((kind) => {
          const active = activeKind === kind.id;
          return (
            <button
              key={kind.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => {
                setActiveKind(kind.id);
                setEditingId(null);
                setError("");
              }}
              className={`flex-1 rounded-sm px-2 py-1.5 text-button-md transition-colors ${
                active ? "bg-ink text-white" : "text-body hover:bg-elevated"
              }`}
            >
              {kind.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-faint">{meta.hint}</p>
        <button
          type="button"
          onClick={() => createMutation.mutate(activeKind)}
          disabled={generating}
          className="btn-sm-primary"
        >
          {generating ? "Queuing…" : `Generate ${meta.label.toLowerCase()}`}
        </button>
      </div>

      {error && <p className="text-body-sm text-error">{error}</p>}

      {isLoading ? (
        <p className="text-body-sm text-mute">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-faint">
          No {meta.label.toLowerCase()} yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((derivative) => (
            <div
              key={derivative.id}
              className="rounded-md border border-hairline bg-elevated p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-mono text-[11px] text-mute">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      derivative.status === "FAILED"
                        ? "bg-error"
                        : derivative.status === "COMPLETED"
                          ? "bg-ink"
                          : "bg-link"
                    }`}
                  />
                  {STATUS_LABEL[derivative.status]}
                  {derivative.aiModel && (
                    <span className="text-faint">· {derivative.aiModel}</span>
                  )}
                </span>

                {derivative.status === "COMPLETED" && (
                  <div className="flex items-center gap-1">
                    {activeKind === "tweet_thread" && derivative.content && (
                      <a
                        href={tweetIntentUrl(firstTweet(derivative.content))}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-sm-ghost"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        Share to X
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => copy(derivative)}
                      className="btn-sm-ghost"
                    >
                      {copiedId === derivative.id ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadFile(
                          `${activeKind}-${derivative.id.slice(0, 8)}.md`,
                          derivative.content ?? "",
                        )
                      }
                      className="btn-sm-ghost"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(derivative.id);
                        setDraft(derivative.content ?? "");
                        setError("");
                      }}
                      className="btn-sm-ghost"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(derivative.id)}
                      disabled={removeMutation.isPending}
                      className="btn-sm-ghost"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {derivative.status === "FAILED" ? (
                <div className="mt-3 flex flex-col gap-3">
                  <p className="text-body-sm text-error">
                    {derivative.errorMessage || "Generation failed."}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await removeMutation.mutateAsync(derivative.id);
                        createMutation.mutate(derivative.kind);
                      }}
                      disabled={
                        removeMutation.isPending || createMutation.isPending
                      }
                      className="btn-sm-primary"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : editingId === derivative.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={12}
                    className="input-default font-mono text-body-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="btn-sm-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        saveMutation.mutate({ id: derivative.id, content: draft })
                      }
                      disabled={saveMutation.isPending}
                      className="btn-sm-primary"
                    >
                      {saveMutation.isPending ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              ) : derivative.content ? (
                <div className="prose-article mt-3 max-w-none text-body-md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {derivative.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="mt-3 text-body-sm text-faint">
                  {STATUS_LABEL[derivative.status]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
