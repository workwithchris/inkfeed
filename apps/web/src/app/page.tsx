import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Turn any YouTube video into a polished article",
};

const features = [
  {
    eyebrow: "01 — EXTRACT",
    title: "Transcript in, noise out",
    body: "Pull the full transcript from any YouTube URL and strip the ums, false starts, and sponsor reads before a single token is spent.",
    icon: (
      <path d="M4 6h16M4 12h10M4 18h7" />
    ),
  },
  {
    eyebrow: "02 — SYNTHESIZE",
    title: "A writer, not a transcriber",
    body: "The model restructures the talk into clean prose with headings, sections, and a summary — not a wall of timestamped text.",
    icon: (
      <path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5" />
    ),
  },
  {
    eyebrow: "03 — EXPORT",
    title: "Markdown you can ship",
    body: "Read it in-app or copy clean Markdown into your CMS, newsletter, or repo. Every article is versioned and listed in your workspace.",
    icon: (
      <path d="M6 4h9l5 5v11H6zM14 4v6h6" />
    ),
  },
];

const templates = [
  {
    tag: "Blog Post",
    title: "Long-form article",
    body: "The default. Sectioned prose with an intro, body, and a closing takeaway.",
  },
  {
    tag: "Newsletter",
    title: "Email issue",
    body: "Tighter rhythm and a scannable summary block built for inbox readers.",
  },
  {
    tag: "Summary",
    title: "Executive brief",
    body: "Key points and pull quotes for teams that need the gist, fast.",
  },
];

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
          <p className="eyebrow">YouTube → Article</p>
          <h1 className="mt-6 max-w-3xl text-display-xl text-ink">
            Turn any YouTube video into a polished article.
          </h1>
          <p className="mt-6 max-w-xl text-body-lg">
            Paste a link. Get clean, sectioned prose you can publish — no
            transcript wrangling, no editing pass.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/app" className="btn-primary">
              Start converting
            </Link>
            <Link href="/pricing" className="btn-secondary">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Logo strip ───────────────────────────────────── */}
      <section className="border-y border-hairline bg-canvas">
        <div className="container-page flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-between">
          <p className="text-body-md text-mute">
            Trusted by writers publishing from video
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-body-md text-faint">
            <span>WRITERS GUILD</span>
            <span>THE BRIEF</span>
            <span>FOUNDERS</span>
            <span>NORTHSIDE</span>
            <span>PODCAST CO.</span>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────── */}
      <section className="container-page py-24 sm:py-section">
        <p className="eyebrow">Capabilities</p>
        <h2 className="mt-4 max-w-2xl text-heading-lg text-ink">
          From raw transcript to finished draft in one pass.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.eyebrow} className="card flex flex-col">
              <span className="flex h-10 w-10 items-center justify-center rounded-md border border-hairline bg-canvas text-ink">
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
              <p className="eyebrow mt-6">{feature.eyebrow}</p>
              <h3 className="mt-2 text-heading-md text-ink">{feature.title}</h3>
              <p className="mt-2 text-body-md">{feature.body}</p>
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
          <div className="code-block shadow-whisper">
            <pre className="whitespace-pre">{`curl -X POST https://api.example.com/api/articles \\
  -H "x-api-key: $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"youtubeUrl":"https://youtu.be/dQw4w9WgXcQ"}'

# → { "id": "art_8f2c", "status": "PENDING" }`}</pre>
          </div>
        </div>
      </section>

      {/* ─── Templates ────────────────────────────────────── */}
      <section className="container-page py-24 sm:py-section">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Templates</p>
            <h2 className="mt-4 text-heading-lg text-ink">
              Shape the output before you ship it.
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Article", "Newsletter", "Blog Post", "Summary"].map((tag, i) => (
              <span
                key={tag}
                className={i === 0 ? "btn-category !bg-ink !text-white" : "btn-category"}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {templates.map((template) => (
            <Link
              key={template.title}
              href="/app"
              className="card flex flex-col transition-colors hover:bg-canvas"
            >
              <span className="eyebrow">{template.tag}</span>
              <h3 className="mt-6 text-heading-md text-ink">{template.title}</h3>
              <p className="mt-2 text-body-md">{template.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── CTA band ─────────────────────────────────────── */}
      <section className="border-t border-hairline">
        <div className="container-page flex flex-col items-center py-24 text-center sm:py-section">
          <p className="eyebrow">Start now</p>
          <h2 className="mt-6 max-w-2xl text-display-xl text-ink">
            Your next article is already on YouTube.
          </h2>
          <p className="mt-6 max-w-lg text-body-lg">
            Paste a URL and watch the draft write itself. No credit card to try
            it.
          </p>
          <Link href="/app" className="btn-primary mt-8">
            Start converting
          </Link>
        </div>
      </section>
    </main>
  );
}
