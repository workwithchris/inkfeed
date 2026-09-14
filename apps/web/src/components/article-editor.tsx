"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ArticleResponse, UpdateArticleInput } from "@/lib/api";
import {
  countWords,
  htmlToMarkdown,
  markdownToHtml,
  parseList,
} from "@/lib/markdown";
import { RichTextEditor } from "./rich-text-editor";
import { ConfirmDialog } from "./ui/confirm-dialog";

interface ArticleEditorProps {
  article: ArticleResponse;
  saving: boolean;
  error?: string;
  onSave: (data: UpdateArticleInput) => void;
  onCancel: () => void;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between gap-2">
        <span className="eyebrow">{label}</span>
        {hint}
      </span>
      {children}
    </label>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  const over = value > max;
  return (
    <span
      className={`font-mono text-[10px] ${
        over ? "text-error" : "text-faint"
      }`}
    >
      {value}/{max}
    </span>
  );
}

export function ArticleEditor({
  article,
  saving,
  error,
  onSave,
  onCancel,
}: ArticleEditorProps) {
  const initialHtml = useMemo(
    () => markdownToHtml(article.content),
    [article.content],
  );

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [title, setTitle] = useState(article.title);
  const [html, setHtml] = useState(initialHtml);
  const [coverImageUrl, setCoverImageUrl] = useState(article.coverImageUrl ?? "");
  const [slug, setSlug] = useState(article.slug ?? "");
  const [metaTitle, setMetaTitle] = useState(article.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    article.metaDescription ?? "",
  );
  const [keywords, setKeywords] = useState((article.keywords ?? []).join(", "));
  const [tags, setTags] = useState((article.tags ?? []).join(", "));

  const titleRef = useRef<HTMLTextAreaElement>(null);

  const words = useMemo(() => countWords(html), [html]);
  const keywordChips = parseList(keywords);
  const tagChips = parseList(tags);

  const dirty =
    title !== article.title ||
    html !== initialHtml ||
    coverImageUrl !== (article.coverImageUrl ?? "") ||
    slug !== (article.slug ?? "") ||
    metaTitle !== (article.metaTitle ?? "") ||
    metaDescription !== (article.metaDescription ?? "") ||
    keywords !== (article.keywords ?? []).join(", ") ||
    tags !== (article.tags ?? []).join(", ");

  const growTitle = () => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    growTitle();
  }, []);

  const save = () => {
    if (!dirty || saving) return;
    onSave({
      title: title.trim(),
      content: htmlToMarkdown(html),
      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      slug: slug.trim(),
      keywords: parseList(keywords),
      tags: parseList(tags),
      coverImageUrl: coverImageUrl.trim(),
    });
  };

  const cancel = () => {
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onCancel();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col">
      {/* Action bar */}
      <div className="sticky top-14 z-30 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-canvas/95 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <p className="eyebrow">Editing article</p>
          <span className="hidden font-mono text-[11px] text-faint sm:inline">
            {words} {words === 1 ? "word" : "words"}
            {dirty ? " · unsaved changes" : " · saved"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="mr-1 hidden max-w-[240px] truncate text-body-sm text-error sm:inline">
              {error}
            </span>
          )}
          <button onClick={cancel} className="btn-sm-ghost">
            Discard
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="btn-sm-primary"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-body-sm text-error sm:hidden">{error}</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ─── Writing column ─────────────────────────────── */}
        <div className="min-w-0">
          <div className="rounded-lg border border-hairline bg-elevated px-6 py-5 transition-colors focus-within:border-ink/50 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <span className="eyebrow">Title</span>
              <span className="font-mono text-[10px] text-faint">
                {title.length} chars
              </span>
            </div>
            <textarea
              ref={titleRef}
              value={title}
              rows={1}
              onChange={(e) => {
                setTitle(e.target.value);
                growTitle();
              }}
              placeholder="Give your article a title…"
              className="mt-2 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[30px] font-semibold leading-[1.25] tracking-[-1.2px] text-ink placeholder:text-faint focus:outline-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-mute">
            {article.channel && <span>{article.channel}</span>}
            <span>·</span>
            <span>{words} words</span>
            <span>·</span>
            <span>≈ {Math.max(1, Math.round(words / 200))} min read</span>
          </div>

          <div className="mt-6">
            <RichTextEditor
              initialHtml={initialHtml}
              onChange={setHtml}
              placeholder="Start writing your article…"
            />
          </div>
        </div>

        {/* ─── Details sidebar ────────────────────────────── */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-32 lg:self-start">
          <div className="card flex flex-col gap-6">
            <p className="eyebrow">Publishing details</p>

            <Field label="Cover image">
              {coverImageUrl.trim() ? (
                <div className="overflow-hidden rounded-md border border-hairline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImageUrl}
                    alt=""
                    className="aspect-video w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-hairline text-body-sm text-faint">
                  No cover image
                </div>
              )}
              <input
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://…/cover.jpg"
                className="input-default"
              />
              {coverImageUrl.trim() && (
                <button
                  type="button"
                  onClick={() => setCoverImageUrl("")}
                  className="self-start text-body-sm text-mute transition-colors hover:text-error"
                >
                  Remove image
                </button>
              )}
            </Field>

            <Field label="Slug">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => slug === "" && setSlug(slugify(title))}
                placeholder="article-url-slug"
                className="input-default"
              />
              <button
                type="button"
                onClick={() => setSlug(slugify(title))}
                className="self-start text-body-sm text-mute transition-colors hover:text-ink"
              >
                Generate from title
              </button>
            </Field>

            <Field
              label="Meta title"
              hint={<Counter value={metaTitle.length} max={60} />}
            >
              <input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="SEO title"
                className="input-default"
              />
            </Field>

            <Field
              label="Meta description"
              hint={<Counter value={metaDescription.length} max={160} />}
            >
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={3}
                placeholder="Short search-result summary (140–160 characters)"
                className="input-default resize-none"
              />
            </Field>

            <Field label="Keywords">
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="comma, separated, keywords"
                className="input-default"
              />
              {keywordChips.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {keywordChips.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-category border border-hairline bg-canvas px-2.5 py-1 text-body-sm text-body"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Tags">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma, separated, tags"
                className="input-default"
              />
              {tagChips.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {tagChips.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm bg-hairline-soft px-2 py-0.5 font-mono text-eyebrow text-body"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>

          <p className="font-mono text-[11px] text-faint">
            ⌘/Ctrl+S to save · Esc to discard
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="Your edits to this article will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setConfirmDiscard(false);
          onCancel();
        }}
      />
    </div>
  );
}
