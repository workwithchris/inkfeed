import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { PlatformIcon } from "@/components/platform-icon";
import type { PublishPlatformId } from "@/lib/api";

export const metadata: Metadata = {
  title: "Turn any source into a publishable article",
};

type SourceId = "youtube" | "url" | "feed" | "document";

const SOURCES: { id: SourceId; label: string }[] = [
  { id: "youtube", label: "YouTube video" },
  { id: "url", label: "Article URL" },
  { id: "feed", label: "RSS / podcast" },
  { id: "document", label: "PDF / DOCX" },
];

const DESTINATIONS: { id: PublishPlatformId; label: string }[] = [
  { id: "devto", label: "Dev.to" },
  { id: "hashnode", label: "Hashnode" },
  { id: "blogger", label: "Blogger" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "github", label: "GitHub" },
  { id: "webhook", label: "Webhook" },
  { id: "site", label: "Inkfeed" },
];

const STEPS = [
  {
    n: "01",
    title: "Add a source",
    body: "A video, an article link, a podcast episode, or a PDF/DOCX.",
  },
  {
    n: "02",
    title: "We extract & write",
    body: "Content is pulled, then rewritten into original prose with SEO metadata.",
  },
  {
    n: "03",
    title: "Edit & publish",
    body: "Tweak the draft, then publish to your platforms or your Inkfeed hub.",
  },
];

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  {
    title: "Many sources, one pipeline",
    body: "YouTube, article URLs, RSS/podcast episodes, and documents all flow into the same extractor.",
    icon: (
      <>
        <path d="M4 7h16M4 12h16M4 17h10" />
      </>
    ),
  },
  {
    title: "A writer, not a transcriber",
    body: "The model restructures the material into clean prose with headings, sections, and a summary.",
    icon: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
  },
  {
    title: "Repurpose in one click",
    body: "Turn any article into a tweet thread, a newsletter issue, or a video script.",
    icon: (
      <>
        <path d="M4 12a8 8 0 0 1 8-8h4" />
        <path d="M20 12a8 8 0 0 1-8 8H8" />
        <path d="M16 4l4 4-4 4" />
        <path d="M8 20l-4-4 4-4" />
      </>
    ),
  },
  {
    title: "Publish anywhere",
    body: "Ship to your blog platforms, a webhook, or a public Inkfeed hub with its own profile URL.",
    icon: (
      <>
        <path d="M12 3v12" />
        <path d="M8 11l4 4 4-4" />
        <path d="M5 21h14" />
      </>
    ),
  },
];

function SourceIcon({ id, className = "h-4 w-4" }: { id: SourceId; className?: string }) {
  if (id === "youtube") {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  }
  if (id === "url") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
        <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
      </svg>
    );
  }
  if (id === "feed") {
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
      <path d="M14 3v5h5" />
      <path d="M6 3h8l5 5v13H6z" />
    </svg>
  );
}

export default function Home() {
  return (
    <main>
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="mesh-gradient pointer-events-none absolute left-1/2 top-[-30%] h-[560px] w-[1100px] -translate-x-1/2 opacity-60"
          aria-hidden
        />
        <div className="container-page relative flex flex-col items-center py-24 text-center sm:py-section">
          <p className="eyebrow">Inkfeed</p>
          <h1 className="mt-6 max-w-3xl text-display-xl text-ink">
            Turn any source into a publishable article.
          </h1>
          <p className="mt-6 max-w-xl text-body-lg">
            Paste a video, article, or feed link — or drop a PDF. Inkfeed pulls
            the content, writes the piece, and publishes it anywhere.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/app" className="btn-primary">
              Start free
            </Link>
            <Link href="#how" className="btn-secondary">
              See how it works
            </Link>
          </div>

          {/* Source → article visual */}
          <div className="mt-16 grid w-full max-w-4xl grid-cols-1 items-center gap-5 rounded-lg border border-hairline bg-elevated p-5 sm:grid-cols-[1fr_auto_1fr] sm:p-6">
            <div className="flex flex-col gap-2">
              {SOURCES.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center gap-3 rounded-md border border-hairline bg-canvas px-3 py-2 text-left"
                >
                  <span className="text-mute">
                    <SourceIcon id={source.id} />
                  </span>
                  <span className="text-body-sm text-body">{source.label}</span>
                </div>
              ))}
            </div>

            <div className="hidden items-center justify-center text-faint sm:flex">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>

            <div className="rounded-md border border-hairline bg-canvas p-4 text-left">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Draft</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-body">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                  Ready
                </span>
              </div>
              <div className="mt-4 h-3 w-4/5 rounded bg-ink/80" />
              <div className="mt-2.5 h-2 w-full rounded bg-hairline" />
              <div className="mt-1.5 h-2 w-full rounded bg-hairline" />
              <div className="mt-1.5 h-2 w-2/3 rounded bg-hairline" />
              <div className="mt-4 h-2 w-1/3 rounded bg-hairline-soft" />
              <div className="mt-2 h-2 w-full rounded bg-hairline-soft" />
              <div className="mt-1.5 h-2 w-5/6 rounded bg-hairline-soft" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Publish destinations ─────────────────────────── */}
      <section className="border-y border-hairline bg-canvas">
        <div className="container-page flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-between">
          <p className="text-body-md text-mute">
            Publish to the platforms you already use — or your own Inkfeed hub.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {DESTINATIONS.map((destination) => (
              <span
                key={destination.id}
                className="flex items-center gap-2 text-body-md text-faint"
              >
                <PlatformIcon platform={destination.id} className="h-4 w-4" />
                {destination.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────── */}
      <section id="how" className="container-page py-24 sm:py-section">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-4 max-w-2xl text-heading-lg text-ink">
          From source to published in one pass.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="flex flex-col gap-3 bg-elevated p-6">
              <span className="font-mono text-eyebrow text-faint">{step.n}</span>
              <h3 className="text-heading-md text-ink">{step.title}</h3>
              <p className="text-body-md text-body">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────── */}
      <section className="container-page pb-24 sm:pb-section">
        <div className="grid grid-cols-1 gap-x-16 gap-y-10 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex gap-4 border-t border-hairline pt-6"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-ink">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {feature.icon}
                </svg>
              </span>
              <div>
                <h3 className="text-heading-md text-ink">{feature.title}</h3>
                <p className="mt-1 text-body-md">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Code band ────────────────────────────────────── */}
      <section className="border-y border-hairline bg-canvas">
        <div className="container-page grid grid-cols-1 items-center gap-12 py-24 lg:grid-cols-2">
          <div>
            <p className="eyebrow">API</p>
            <h2 className="mt-4 text-heading-lg text-ink">
              Automate the whole pipeline.
            </h2>
            <p className="mt-4 max-w-md text-body-lg">
              One request creates the job. A server-sent event stream reports
              progress while the article is written. Poll or subscribe — your
              call.
            </p>
            <Link href="/app" className="btn-secondary mt-6">
              Open the workspace
            </Link>
          </div>
          <div className="code-block">
            <pre className="whitespace-pre">{`curl -X POST https://api.inkfeed.online/api/articles \\
  -H "x-api-key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"sourceType":"youtube","url":"https://youtu.be/dQw4w9WgXcQ"}'

# → { "id": "art_8f2c", "status": "PENDING" }`}</pre>
          </div>
        </div>
      </section>

      {/* ─── CTA band ─────────────────────────────────────── */}
      <section className="border-t border-hairline">
        <div className="container-page flex flex-col items-center py-24 text-center sm:py-section">
          <p className="eyebrow">Start now</p>
          <h2 className="mt-6 max-w-2xl text-display-xl text-ink">
            Your next article is already out there.
          </h2>
          <p className="mt-6 max-w-lg text-body-lg">
            Paste a link or drop a file and watch the draft write itself. No
            credit card to try it.
          </p>
          <Link href="/app" className="btn-primary mt-8">
            Start free
          </Link>
        </div>
      </section>
    </main>
  );
}
