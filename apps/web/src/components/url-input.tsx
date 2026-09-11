"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createArticle,
  uploadArticle,
  inspectFeed,
  type FeedItem,
} from "@/lib/api";

type Mode = "youtube" | "url" | "feed" | "file";

const MODES: { id: Mode; label: string; placeholder: string }[] = [
  {
    id: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/watch?v=...",
  },
  { id: "url", label: "Article", placeholder: "https://example.com/blog-post" },
  { id: "feed", label: "RSS", placeholder: "https://example.com/feed.xml" },
  { id: "file", label: "File", placeholder: "" },
];

function ModeIcon({ mode, className = "h-4 w-4" }: { mode: Mode; className?: string }) {
  if (mode === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  }
  if (mode === "url") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
      </svg>
    );
  }
  if (mode === "feed") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 16V4" />
      <path d="M8 8l4-4 4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function isValidYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

export function UrlInput() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("youtube");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [feedTitle, setFeedTitle] = useState("");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState("");

  const go = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ["articles"] });
    router.push(`/app/articles/${id}`);
  };

  const createMutation = useMutation({
    mutationFn: createArticle,
    onSuccess: (data) => go(data.id),
    onError: (err: Error) => setError(err.message),
  });

  const uploadMutation = useMutation({
    mutationFn: (input: { filename: string; contentBase64: string }) =>
      uploadArticle(input.filename, input.contentBase64),
    onSuccess: (data) => go(data.id),
    onError: (err: Error) => setError(err.message),
  });

  const inspectMutation = useMutation({
    mutationFn: inspectFeed,
    onSuccess: (data) => {
      setFeedTitle(data.title);
      setItems(data.items);
      setSelectedIndex(0);
      setError(data.items.length ? "" : "No episodes found in this feed");
    },
    onError: (err: Error) => setError(err.message),
  });

  const pending = createMutation.isPending || uploadMutation.isPending;
  const fetching = inspectMutation.isPending;
  const selected = items[selectedIndex] ?? null;

  const resetFeed = () => {
    setItems([]);
    setSelectedIndex(0);
    setFeedTitle("");
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setError("");
    setUrl("");
    setFile(null);
    setDragging(false);
    resetFeed();
    if (fileRef.current) fileRef.current.value = "";
  };

  const pickFile = (next: File | null) => {
    setFile(next);
    setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "file") {
      if (!file) {
        setError("Choose a file to upload");
        return;
      }
      try {
        const contentBase64 = await readFileAsBase64(file);
        uploadMutation.mutate({ filename: file.name, contentBase64 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read the file");
      }
      return;
    }

    if (!url.trim()) {
      setError("Enter a URL to continue");
      return;
    }

    // Feed not yet fetched → the primary action fetches episodes first.
    if (mode === "feed" && items.length === 0) {
      inspectMutation.mutate(url.trim());
      return;
    }

    if (mode === "youtube") {
      if (!isValidYouTubeUrl(url)) {
        setError("Enter a valid YouTube URL");
        return;
      }
      createMutation.mutate({ sourceType: "youtube", url: url.trim() });
      return;
    }

    if (mode === "url") {
      createMutation.mutate({ sourceType: "url", url: url.trim() });
      return;
    }

    // feed
    if (!selected) {
      setError("Pick an episode");
      return;
    }
    const itemUrl = selected.link ?? selected.audioUrl ?? undefined;
    if (!itemUrl) {
      setError("That episode has no link to extract");
      return;
    }
    createMutation.mutate({ sourceType: "feed", url: url.trim(), itemUrl });
  };

  const feedNeedsFetch = mode === "feed" && items.length === 0;
  const busy = pending || fetching;

  const primaryLabel = pending
    ? "Creating…"
    : fetching
      ? "Fetching…"
      : feedNeedsFetch
        ? "Fetch episodes"
        : mode === "file"
          ? "Upload & convert"
          : "Convert";

  const primaryDisabled =
    busy ||
    (mode === "file" ? !file : !url.trim()) ||
    (mode === "feed" && !feedNeedsFetch && !selected);

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {/* Source tabs */}
      <div
        role="tablist"
        aria-label="Source type"
        className="flex items-center gap-1 border-b border-hairline"
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeMode(m.id)}
              disabled={busy}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-button-md transition-colors disabled:opacity-50 ${
                active
                  ? "border-ink text-ink"
                  : "border-transparent text-mute hover:text-ink"
              }`}
            >
              <ModeIcon mode={m.id} className="h-4 w-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      {mode === "file" ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0] ?? null);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
            dragging
              ? "border-ink bg-canvas"
              : "border-hairline bg-canvas hover:border-ink/40"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-elevated text-ink">
            <ModeIcon mode="file" className="h-5 w-5" />
          </span>
          {file ? (
            <>
              <span className="max-w-full truncate text-body-md font-medium text-ink">
                {file.name}
              </span>
              <span className="text-body-sm text-faint">
                {(file.size / 1024).toFixed(0)} KB · click to replace
              </span>
            </>
          ) : (
            <>
              <span className="text-body-md font-medium text-ink">
                Drop a file or click to browse
              </span>
              <span className="text-body-sm text-faint">
                PDF, DOCX, PPTX, XLSX, XLS, EPUB, IPYNB, ZIP, MSG + more
              </span>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.pptx,.xlsx,.xls,.csv,.html,.htm,.epub,.ipynb,.zip,.msg"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            disabled={busy}
            className="hidden"
          />
        </label>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
            <ModeIcon mode={mode} className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
              if (mode === "feed") resetFeed();
            }}
            placeholder={
              MODES.find((m) => m.id === mode)?.placeholder ?? "https://..."
            }
            className="input-default h-11 pl-10"
            disabled={busy}
          />
        </div>
      )}

      {/* Feed episodes */}
      {mode === "feed" && items.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="eyebrow truncate">{feedTitle || "Episodes"}</p>
            <span className="font-mono text-eyebrow text-faint">
              {items.length} found
            </span>
          </div>
          <div
            role="radiogroup"
            aria-label="Episode"
            className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-hairline bg-canvas p-1"
          >
            {items.map((item, i) => {
              const active = selectedIndex === i;
              return (
                <button
                  key={`${item.link ?? item.audioUrl ?? item.title}-${i}`}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelectedIndex(i)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                    active ? "bg-ink text-white" : "hover:bg-elevated"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      active ? "border-white bg-white text-ink" : "border-hairline"
                    }`}
                  >
                    {active && (
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md">
                      {item.title}
                    </span>
                    {item.publishedAt && (
                      <span
                        className={`block truncate text-body-sm ${
                          active ? "text-white/70" : "text-faint"
                        }`}
                      >
                        {new Date(item.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-3">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={primaryDisabled}
          className="btn-primary w-full sm:w-auto sm:self-end"
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {primaryLabel}
            </span>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              {primaryLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
