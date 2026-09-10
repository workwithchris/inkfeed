"use client";

import { useState } from "react";
import type { ArticleResponse } from "@/lib/api";
import { stripTldr } from "@/lib/content";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(
  /\/$/,
  "",
);

type Format = "markdown" | "json" | "html";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function canonical(a: ArticleResponse): string {
  return `${SITE}/article/${a.slug ?? a.id}`;
}

function buildMarkdown(a: ArticleResponse): string {
  const lines = [
    "---",
    `title: ${a.metaTitle ?? a.title}`,
    `description: ${a.metaDescription ?? a.summary ?? ""}`,
    `slug: ${a.slug ?? ""}`,
    `keywords: ${(a.keywords ?? []).join(", ")}`,
    `tags: ${(a.tags ?? []).join(", ")}`,
    `source: ${a.youtubeUrl}`,
  ];
  if (a.channel) lines.push(`author: ${a.channel}`);
  lines.push(`date: ${new Date(a.createdAt).toISOString().slice(0, 10)}`);
  lines.push("---", "", stripTldr(a.content));
  return lines.join("\n");
}

function buildJson(a: ArticleResponse): string {
  return JSON.stringify(
    {
      title: a.metaTitle ?? a.title,
      slug: a.slug ?? "",
      description: a.metaDescription ?? a.summary ?? "",
      keywords: a.keywords ?? [],
      tags: a.tags ?? [],
      canonical: canonical(a),
      source: a.youtubeUrl,
      author: a.channel,
      readingTimeMinutes: a.readingTimeMinutes,
      content: stripTldr(a.content),
    },
    null,
    2,
  );
}

function buildHtml(a: ArticleResponse): string {
  const title = escapeHtml(a.metaTitle ?? a.title);
  const description = escapeHtml(a.metaDescription ?? a.summary ?? "");
  const keywords = escapeHtml((a.keywords ?? []).join(", "));
  const url = escapeHtml(canonical(a));
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.metaTitle ?? a.title,
    description: a.metaDescription ?? a.summary ?? "",
    keywords: (a.keywords ?? []).join(", "),
    author: a.channel ? { "@type": "Person", name: a.channel } : undefined,
    datePublished: new Date(a.createdAt).toISOString(),
    url: canonical(a),
  });

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="keywords" content="${keywords}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join("\n");
}

const tabs: { id: Format; label: string }[] = [
  { id: "markdown", label: "Markdown" },
  { id: "json", label: "JSON" },
  { id: "html", label: "HTML" },
];

export function SeoPanel({ article }: { article: ArticleResponse }) {
  const [tab, setTab] = useState<Format>("markdown");
  const [copied, setCopied] = useState(false);

  const hasSeo =
    !!article.metaTitle || !!article.slug || !!article.keywords?.length;
  if (!hasSeo) return null;

  const output =
    tab === "markdown"
      ? buildMarkdown(article)
      : tab === "json"
        ? buildJson(article)
        : buildHtml(article);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <section className="mt-10 rounded-lg border border-hairline bg-elevated p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="eyebrow">SEO &amp; export</p>
        {article.readingTimeMinutes && (
          <span className="font-mono text-eyebrow text-faint">
            {article.readingTimeMinutes} min read
          </span>
        )}
      </div>

      {/* Search preview */}
      <div className="mt-5 rounded-md border border-hairline bg-canvas p-4">
        <p className="truncate text-body-sm text-mute">{canonical(article)}</p>
        <p className="mt-1 text-[18px] leading-6 text-link">
          {article.metaTitle ?? article.title}
        </p>
        <p className="mt-1 line-clamp-2 text-body-sm text-body">
          {article.metaDescription ?? article.summary}
        </p>
      </div>

      {/* Keywords */}
      {!!article.keywords?.length && (
        <div className="mt-5">
          <p className="eyebrow">Keywords</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {article.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-category border border-hairline bg-canvas px-3 py-1 text-body-sm text-body"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {!!article.tags?.length && (
        <div className="mt-5">
          <p className="eyebrow">Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-hairline-soft px-2 py-0.5 font-mono text-eyebrow text-body"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Export formats */}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-hairline pt-5">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-sm px-2.5 py-1 text-button-md transition-colors ${
                tab === t.id
                  ? "bg-ink text-white"
                  : "text-body hover:bg-canvas"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={copy} className="btn-sm-primary">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre className="mt-4 max-h-80 overflow-auto rounded-md border border-hairline bg-canvas p-4 font-mono text-[12px] leading-5 text-body">
        {output}
      </pre>
    </section>
  );
}
