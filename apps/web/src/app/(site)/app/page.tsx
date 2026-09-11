import type { Metadata } from "next";
import { QueryProvider } from "@/components/query-provider";
import { UrlInput } from "@/components/url-input";
import { ArticleList } from "@/components/article-list";
import { WriteFromScratch } from "@/components/write-from-scratch";

export const metadata: Metadata = {
  title: "Convert",
  description: "Paste a link or upload a file and generate a polished article.",
};

const steps = [
  { label: "Pick a source", body: "Video, article URL, feed, or file." },
  { label: "Wait for the draft", body: "Content in, prose out." },
  { label: "Read or export", body: "Clean Markdown, ready to ship." },
];

const sources = [
  "YouTube videos",
  "Article & blog URLs",
  "RSS / podcast episodes",
  "PDF & DOCX uploads",
];

const outputs = ["Sectioned prose", "Summary & SEO", "Publish anywhere", "Repurpose to threads"];

export default function AppPage() {
  return (
    <QueryProvider>
      <main>
        {/* ─── Header band ──────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-hairline">
          <div
            className="mesh-gradient pointer-events-none absolute right-[-20%] top-[-60%] h-[360px] w-[720px] opacity-30"
            aria-hidden
          />
          <div className="container-page relative py-16">
            <p className="eyebrow">Workspace</p>
            <h1 className="mt-4 text-heading-lg text-ink">Convert anything</h1>
            <p className="mt-3 max-w-lg text-body-lg">
              Turn a YouTube video, article URL, RSS/podcast episode, or a
              PDF/DOCX into a polished article — sectioned, summarized, and
              ready to publish.
            </p>
          </div>
        </section>

        {/* ─── Workspace ────────────────────────────────────── */}
        <section className="container-page py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main column */}
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <p className="eyebrow">New conversion</p>
                    <span className="font-mono text-eyebrow text-faint">
                      01 / input
                    </span>
                  </div>
                  <WriteFromScratch />
                </div>
                <UrlInput />
              </div>

              <ArticleList />
            </div>

            {/* Sidebar */}
            <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
              <div>
                <p className="eyebrow">How it works</p>
                <ol className="mt-5 flex flex-col gap-5">
                  {steps.map((step, i) => (
                    <li key={step.label} className="flex gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-hairline font-mono text-[11px] font-medium text-mute">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-body-md font-medium text-ink">
                          {step.label}
                        </p>
                        <p className="mt-0.5 text-body-sm text-mute">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="border-t border-hairline pt-8">
                <p className="eyebrow">Works with</p>
                <ul className="mt-5 flex flex-col gap-3">
                  {sources.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-body-md text-body"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-hairline pt-8">
                <p className="eyebrow">You get</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {outputs.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-hairline bg-elevated px-3 py-1 text-body-sm text-body"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </QueryProvider>
  );
}
