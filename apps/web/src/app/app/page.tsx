import type { Metadata } from "next";
import { QueryProvider } from "@/components/query-provider";
import { UrlInput } from "@/components/url-input";
import { ArticleList } from "@/components/article-list";

export const metadata: Metadata = {
  title: "Convert",
  description: "Paste a YouTube URL and generate a polished article.",
};

const steps = [
  { label: "Paste a YouTube URL", body: "Any watch, share, or short link." },
  { label: "Wait for the draft", body: "Transcript in, prose out." },
  { label: "Read or export", body: "Clean Markdown, ready to ship." },
];

const outputs = ["Sectioned prose", "Summary block", "Markdown export", "Versioned history"];

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
            <h1 className="mt-4 text-heading-lg text-ink">Convert a video</h1>
            <p className="mt-3 max-w-lg text-body-lg">
              Paste a YouTube URL and get a polished article — sectioned,
              summarized, and ready to publish.
            </p>
          </div>
        </section>

        {/* ─── Workspace ────────────────────────────────────── */}
        <section className="container-page py-12">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main column */}
            <div className="flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="eyebrow">New conversion</p>
                  <span className="font-mono text-eyebrow text-faint">
                    01 / input
                  </span>
                </div>
                <UrlInput />
              </div>

              <ArticleList />
            </div>

            {/* Sidebar */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
              <div className="card">
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

              <div className="card">
                <p className="eyebrow">You get</p>
                <ul className="mt-5 flex flex-col gap-3">
                  {outputs.map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-body-md text-body"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 text-ink"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </QueryProvider>
  );
}
