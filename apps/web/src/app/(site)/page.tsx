import type { Metadata } from "next";
import Link from "next/link";
import { PlatformIcon } from "@/components/platform-icon";
import type { PublishPlatformId } from "@/lib/api";

export const metadata: Metadata = {
  title: "Inkfeed — every source becomes a finished piece",
  description:
    "Paste a video, article, podcast, or PDF. Inkfeed pulls the content, writes the piece, and files it to your platforms or your own hub.",
};

type WireState = "extracting" | "writing" | "queued";

const INCOMING: {
  time: string;
  kind: string;
  title: string;
  state: WireState;
}[] = [
  { time: "12:04", kind: "youtube", title: "Attention Is All You Need — talk", state: "extracting" },
  { time: "12:03", kind: "pdf", title: "Q3 strategy memo (22 pp)", state: "writing" },
  { time: "12:01", kind: "rss", title: "The Boring Show · ep 214", state: "queued" },
  { time: "11:58", kind: "url", title: "What the web taught us about reading", state: "writing" },
  { time: "11:54", kind: "podcast", title: "Founders in the weeds · ep 12", state: "queued" },
];

const FILED: { time: string; title: string; desks: string[] }[] = [
  { time: "12:05", title: "Attention, revisited", desks: ["Dev.to", "Inkfeed"] },
  { time: "12:04", title: "The memo, explained in plain terms", desks: ["Newsletter"] },
  { time: "12:02", title: "Episode 214, written up", desks: ["Hashnode"] },
  { time: "11:59", title: "How we learned to read online", desks: ["GitHub", "Webhook"] },
  { time: "11:55", title: "Twelve episodes in, what changed", desks: ["Inkfeed"] },
];

const STEPS = [
  {
    n: "01",
    kicker: "Intake",
    title: "Add a source",
    body: "A video, an article link, a podcast episode, a playlist, or a PDF/DOCX. Drop it in.",
  },
  {
    n: "02",
    kicker: "Rewrite",
    title: "We extract and write",
    body: "The content is pulled, then restructured into original prose with a summary and SEO metadata.",
  },
  {
    n: "03",
    kicker: "File",
    title: "Edit and publish",
    body: "Tweak the draft, then file it to your platforms, a webhook, or your own Inkfeed hub.",
  },
];

const BRIEFS: { kicker: string; title: string; body: string }[] = [
  {
    kicker: "Sources",
    title: "Many feeds, one pipeline",
    body: "YouTube, article URLs, RSS and podcast episodes, and documents all run through the same extractor.",
  },
  {
    kicker: "Writing",
    title: "A writer, not a transcriber",
    body: "The model rebuilds the material into clean prose: headings, sections, a summary, and a slug.",
  },
  {
    kicker: "Repurpose",
    title: "One piece, several shapes",
    body: "Turn any article into a tweet thread, a newsletter issue, or a video script.",
  },
  {
    kicker: "Distribution",
    title: "File it anywhere",
    body: "Ship to your blog platforms, a webhook, or a public Inkfeed hub with its own profile URL.",
  },
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

const STATE_LABEL: Record<WireState, string> = {
  extracting: "Extracting",
  writing: "Writing",
  queued: "Queued",
};

const STATE_DOT: Record<WireState, string> = {
  extracting: "bg-signal signal-dot",
  writing: "bg-link",
  queued: "bg-faint",
};

function IncomingRow({
  time,
  kind,
  title,
  state,
}: {
  time: string;
  kind: string;
  title: string;
  state: WireState;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-hairline px-4 py-3 font-mono text-[11px]">
      <span className="w-9 shrink-0 text-faint">{time}</span>
      <span className="w-16 shrink-0 uppercase tracking-[0.1em] text-mute">
        {kind}
      </span>
      <span className="min-w-0 flex-1 truncate text-ink">{title}</span>
      <span className="hidden shrink-0 items-center gap-1.5 uppercase tracking-[0.1em] text-mute sm:flex">
        <span className={`h-1.5 w-1.5 rounded-full ${STATE_DOT[state]}`} />
        {STATE_LABEL[state]}
      </span>
    </div>
  );
}

function FiledRow({
  time,
  title,
  desks,
}: {
  time: string;
  title: string;
  desks: string[];
}) {
  return (
    <div className="border-b border-hairline px-4 py-3">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-faint">{time}</span>
        <span className="min-w-0 flex-1 truncate text-body-md text-ink">
          {title}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
        {desks.map((d) => (
          <span
            key={d}
            className="rounded-full border border-hairline px-2 py-0.5"
          >
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* ─── Masthead ─────────────────────────────────────── */}
      <div className="border-b border-hairline">
        <div className="container-page flex h-12 items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
          <span className="inline-flex items-center gap-2 text-ink">
            <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal" />
            Inkfeed Wire
          </span>
          <span className="hidden sm:block">Source → copy, on the record</span>
          <span>Vol. 01 · No. 01</span>
        </div>
      </div>

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="container-page grid grid-cols-1 items-start gap-14 py-20 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-20 lg:py-section">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
              The desk
            </p>
            <h1 className="mt-6 max-w-[15ch] text-display-xl text-ink">
              Every source becomes a finished piece.
            </h1>
            <p className="mt-6 max-w-md text-body-lg">
              Paste a video, an article, a podcast, or a PDF. Inkfeed pulls the
              content, writes the piece, and files it to your platforms — or
              your own hub.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/app" className="btn-primary">
                Start free
              </Link>
              <Link href="#wire" className="btn-secondary">
                Watch the wire
              </Link>
            </div>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              No credit card · Bring your own AI keys
            </p>
          </div>

          {/* Signature: the wire */}
          <div
            id="wire"
            className="overflow-hidden rounded-lg border border-hairline bg-elevated"
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em]">
              <span className="inline-flex items-center gap-2 text-ink">
                <span className="signal-dot h-1.5 w-1.5 rounded-full bg-signal" />
                Incoming
              </span>
              <span className="text-mute">Filed</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <div
                className="h-[300px] overflow-hidden border-b border-hairline sm:border-b-0 sm:border-r"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
                }}
              >
                <div className="wire-scroll">
                  {[...INCOMING, ...INCOMING].map((row, i) => (
                    <IncomingRow key={i} {...row} />
                  ))}
                </div>
              </div>
              <div
                className="h-[300px] overflow-hidden"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
                }}
              >
                <div className="wire-scroll" style={{ animationDirection: "reverse" }}>
                  {[...FILED, ...FILED].map((row, i) => (
                    <FiledRow key={i} {...row} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Source → copy ───────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="container-page py-24 sm:py-section">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
                Rewrite
              </p>
              <h2 className="mt-4 max-w-xl text-heading-lg text-ink">
                The same story, written for people.
              </h2>
            </div>
            <p className="max-w-sm text-body-md text-mute">
              Raw transcript in. Structured, readable copy out — with headings,
              a summary, and metadata a publisher can use.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-lg border border-hairline lg:grid-cols-2">
            <div className="border-b border-hairline bg-canvas p-6 lg:border-b-0 lg:border-r">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                Raw · transcript
              </p>
              <p className="mt-4 font-mono text-body-sm leading-6 text-mute">
                so um the thing about attention is that it&apos;s basically a
                weighted sum right and the weights come from the query key
                similarity and uh then we scale it by root dk and you know
                there&apos;s also the multi head part which is sort of like
                running it in parallel...
              </p>
            </div>
            <div className="bg-elevated p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
                Filed · article
              </p>
              <h3 className="mt-4 text-heading-md text-ink">
                Attention, revisited
              </h3>
              <p className="mt-3 text-body-lg text-body first-letter:float-left first-letter:mr-2 first-letter:text-[52px] first-letter:font-semibold first-letter:leading-[0.78] first-letter:text-ink">
                Attention is a weighted sum. Each token queries the others,
                compares itself against their keys, and pulls back a blend of
                their values. Scaling by the square root of the head dimension
                keeps those weights stable as the model grows.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
                {["transformers", "attention", "ml"].map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-hairline px-2 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Dispatch log ────────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="container-page py-24 sm:py-section">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
            Dispatch log
          </p>
          <h2 className="mt-4 max-w-2xl text-heading-lg text-ink">
            Three moves from a link to a published post.
          </h2>
          <ol className="mt-12 border-l border-hairline">
            {STEPS.map((step) => (
              <li key={step.n} className="relative pb-10 pl-8 last:pb-0">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border border-hairline bg-elevated" />
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                  {step.n} / {step.kicker}
                </span>
                <h3 className="mt-2 text-heading-md text-ink">{step.title}</h3>
                <p className="mt-1 max-w-xl text-body-md text-body">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Briefs ──────────────────────────────────────── */}
      <section className="border-b border-hairline">
        <div className="container-page py-24 sm:py-section">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
            Briefs
          </p>
          <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-10 sm:grid-cols-2">
            {BRIEFS.map((brief) => (
              <div key={brief.title} className="border-t border-hairline pt-6">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                  {brief.kicker}
                </span>
                <h3 className="mt-2 text-heading-md text-ink">
                  {brief.title}
                </h3>
                <p className="mt-1 text-body-md text-body">{brief.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Filed to ────────────────────────────────────── */}
      <section className="border-b border-hairline bg-canvas">
        <div className="container-page flex flex-col items-center gap-6 py-8 sm:flex-row sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">
            Filed to
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

      {/* ─── CTA ─────────────────────────────────────────── */}
      <section>
        <div className="container-page flex flex-col items-center py-24 text-center sm:py-section">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
            Send the first one
          </p>
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
