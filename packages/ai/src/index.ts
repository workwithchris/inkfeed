import type {
  AiTransformRequest,
  AiTransformResponse,
  AiDerivativeResponse,
  AiSeoMeta,
  AiRoute,
  DerivativeKind,
} from "@repo/types";
import { dirname, join } from "path";
import { pathToFileURL } from "url";

// ─── Lazy-loaded router (ESM dynamic import from CJS host) ─
let routerInstance: unknown = null;
let defaultRouteId: string | null = null;
let corePromise: Promise<{ AIRouter: new (config: unknown) => unknown }> | null =
  null;

// Resolve physical path to @ai-router/core/dist/index.js
// CJS require can't find it (no "require" export), so we locate it manually
function resolveAiRouterPath(): string {
  // Walk up from this file to find node_modules/@ai-router/core
  let dir = __dirname;
  for (;;) {
    const candidate = join(dir, "node_modules", "@ai-router", "core", "dist", "index.js");
    try {
      // Verify file exists
      require("fs").accessSync(candidate);
      return candidate;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error("Cannot find @ai-router/core in node_modules");
}

function loadCore(): Promise<{ AIRouter: new (config: unknown) => unknown }> {
  if (!corePromise) {
    const modPath = resolveAiRouterPath();
    // Dynamic import() needs a file:// URL on Windows (a bare C:\ path is
    // rejected by the ESM loader as an unsupported protocol).
    corePromise = import(pathToFileURL(modPath).href) as Promise<{
      AIRouter: new (config: unknown) => unknown;
    }>;
  }
  return corePromise;
}

async function getRouter(): Promise<unknown> {
  if (routerInstance) return routerInstance;

  const { AIRouter } = await loadCore();

  const routes = [];

  if (process.env.OPENAI_API_KEY) {
    routes.push({
      id: "openai",
      provider: "openai",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      limit: { rpm: 60 },
    });
  }

  if (process.env.OPENROUTER_API_KEY) {
    routes.push({
      id: "openrouter",
      provider: "openai-compatible",
      model: process.env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-lightning:free",
      apiKey: process.env.OPENROUTER_API_KEY,
      baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      limit: { rpm: 30 },
    });
  }

  if (process.env.DEEPSEEK_API_KEY) {
    routes.push({
      id: "deepseek",
      provider: "deepseek",
      model: "deepseek-chat",
      apiKey: process.env.DEEPSEEK_API_KEY,
      limit: { rpm: 30 },
    });
  }

  if (process.env.OPENCODE_API_KEY) {
    routes.push({
      id: "opencode",
      provider: "openai-compatible",
      model: process.env.OPENCODE_MODEL || "deepseek-v4-flash",
      apiKey: process.env.OPENCODE_API_KEY,
      baseUrl: process.env.OPENCODE_BASE_URL || "https://opencode.ai/zen/go/v1",
      headers: {
        "x-opencode-session": "inkfeed-" + Date.now(),
        "user-agent": "inkfeed/1.0",
      },
      limit: { rpm: 30 },
    });
  }

  if (routes.length === 0) {
    throw new Error(
      "No AI providers configured. Set OPENAI_API_KEY, OPENROUTER_API_KEY, DEEPSEEK_API_KEY, or OPENCODE_API_KEY.",
    );
  }

  routerInstance = new AIRouter({
    strategy: "fallback",
    routes,
  });

  defaultRouteId = routes[0]!.id;

  return routerInstance;
}

// Build a one-off router from a caller-supplied (BYOK) route list.
async function createRouterFromRoutes(
  routes: AiRoute[],
): Promise<{ router: unknown; routeId: string }> {
  const { AIRouter } = await loadCore();
  const router = new AIRouter({ strategy: "fallback", routes });
  return { router, routeId: routes[0]!.id };
}

// ─── Prompt builder ───────────────────────────────────────
function buildPrompt(req: AiTransformRequest): string {
  const style = req.style || "blog";
  const styleInstructions: Record<string, string> = {
    blog: "This is a long-form editorial article for a professional audience: authoritative, evergreen, and practical, with clear sections and real insight.",
    newsletter: "This is a polished newsletter issue for professional readers: a strong opening hook, scannable sections, and a concise closing takeaway.",
    academic: "This is a formal, objective piece: structured sections, measured tone, and evidence-led statements suitable for a professional or academic audience.",
  };

  return `You are a senior editor and subject-matter writer. Turn the transcript below into an original, publication-ready ${style} article for a professional audience.

Video title: "${req.title}"

${styleInstructions[style]}

VOICE AND STANCE:
- Write in a confident, editorial third-person voice — as an informed author explaining the subject, never as someone recapping a video.
- Never mention or allude to the source: no "in this video", "the video", "the transcript", "the speaker", "the presenter", "the host", "the creator", or the channel name.
- Do not attribute ideas to a person and do not use reported speech. Ban phrasing like "he said", "she states", "they explain", "he covers", "the speaker argues". Convert every such statement into direct, declarative prose.
- Present the material as established fact and analysis, as if it were your own expertise.
- No greetings, filler, conversational tics, sponsor or promotional mentions, or calls to subscribe.
- Use precise, concrete language and active voice. Avoid hype, clichés, and vague or inflated claims.

STRUCTURE AND QUALITY:
- Lead with a strong, informative opening paragraph that frames the subject and why it matters.
- Organize with clear H2 sections and H3 subsections that build logically; cover one idea per section.
- Keep paragraphs tight (2-4 sentences) and scannable.
- Ground the piece in specifics — examples, steps, numbers, definitions, or trade-offs drawn from the material.
- Synthesize and reorganize the ideas; do not follow the transcript's chronological or conversational order, and drop repetition and digressions.
- Use **bold** for key terms and concepts, bullet lists for enumeration, and blockquotes only for genuinely quotable lines.
- End with a "Key Takeaways" section of 3-5 concise takeaways.

OUTPUT FORMAT (exact, no code fences anywhere):
Start with a YAML frontmatter block fenced by --- lines, then the Markdown article body.
Frontmatter keys (all required):
title: SEO meta title, max 60 characters, plain text, no quotes
description: meta description, 140-160 characters, plain text, no quotes
slug: kebab-case URL slug, max 6 words, no quotes
keywords: 5-8 comma-separated search keywords, most important first
tags: 3-5 comma-separated topical tags

Example:
---
title: How to Build X in 2025
description: A practical guide to building X, covering setup, common pitfalls, and shipping to production in a weekend.
slug: how-to-build-x-2025
keywords: build x, x tutorial, production x, x setup, x guide
tags: engineering, tutorial, productivity
---

ARTICLE RULES:
- Start with a compelling H1 title (# Title)
- Write 800-1500 words
- NO TL;DR section in the body (a summary is generated separately)
- NO timestamps, NO speaker labels, NO "[Music]" or similar tags

Transcript:
${req.transcript}`;
}

// ─── Extract summary from generated content ───────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*|__/g, "")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSummary(content: string): string | null {
  const labelled = content.match(
    /(?:TL;?DR|Summary)\s*:?\s*([\s\S]+?)(?:\n{2,}|\n#{1,6}\s)/i,
  );

  let source = labelled?.[1];
  if (!source) {
    source =
      content
        .replace(/^#.*$/m, "")
        .split(/\n{2,}/)
        .find((p) => stripMarkdown(p).length > 0) ?? "";
  }

  const clean = stripMarkdown(source);
  if (!clean) return null;
  return clean.length > 280 ? clean.slice(0, 277).trimEnd() + "..." : clean;
}

// ─── Frontmatter parsing ──────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function splitList(value: string): string[] {
  return value
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function parseFrontmatter(raw: string): {
  content: string;
  meta: Partial<AiSeoMeta>;
} {
  const text = raw
    .replace(/^\s*```[a-z]*\n/i, "")
    .replace(/\n```\s*$/i, "")
    .trim();

  if (!text.startsWith("---")) return { content: text, meta: {} };

  const end = text.indexOf("\n---", 3);
  if (end === -1) return { content: text, meta: {} };

  const block = text.slice(3, end).trim();
  const content = text.slice(end + 4).trim();
  const meta: Partial<AiSeoMeta> = {};

  for (const line of block.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (key === "title" || key === "metatitle") meta.metaTitle = value;
    else if (key === "description" || key === "metadescription")
      meta.metaDescription = value;
    else if (key === "slug") meta.slug = value;
    else if (key === "keywords") meta.keywords = splitList(value);
    else if (key === "tags") meta.tags = splitList(value);
  }

  return { content, meta };
}

// ─── Derivative prompt builder ────────────────────────────
function buildDerivativePrompt(
  req: AiTransformRequest,
  kind: DerivativeKind,
): { system: string; prompt: string } {
  const noAttribution = `Source title: "${req.title}".

VOICE:
- Write in a confident, first-person-plural or neutral editorial voice, as an expert on the subject.
- Never mention or allude to the source video, transcript, speaker, host, or channel. Do not attribute ideas to a person or use reported speech.
- No sponsor or promotional mentions and no calls to subscribe.
- Use precise, concrete language; avoid hype and clichés.

Source transcript:
${req.transcript}`;

  switch (kind) {
    case "tweet_thread":
      return {
        system:
          "You are a social media strategist who turns raw source material into high-engagement Twitter/X threads.",
        prompt: `Turn the source material into a Twitter/X thread.

${noAttribution}

OUTPUT FORMAT (exact):
- Output ONLY the thread. No preamble, no title, no frontmatter, no code fences.
- 8-12 tweets, each numbered like "1/", "2/", etc.
- Every tweet must be 280 characters or fewer.
- The first tweet is a strong curiosity-driven hook.
- Use short lines and line breaks for scannability; at most one hashtag, only if natural.
- The final tweet is a concise takeaway, optionally with a soft follow prompt.`,
      };
    case "newsletter":
      return {
        system:
          "You are a newsletter writer who turns raw source material into a polished, skimmable email issue.",
        prompt: `Turn the source material into a newsletter issue.

${noAttribution}

OUTPUT FORMAT (exact):
- Start with a "Subject:" line, then a short preview text line, then the body.
- Open with a strong hook paragraph; keep paragraphs to 2-3 sentences.
- Organize with clear Markdown H2/H3 sections and bullet lists where useful.
- Include one blockquote pull-quote only if genuinely quotable.
- Close with a short "The takeaway" paragraph and a light sign-off.
- Write 500-900 words. No code fences.`,
      };
    case "video_script":
      return {
        system:
          "You are a YouTube scriptwriter who turns raw source material into a tight, watchable video script.",
        prompt: `Turn the source material into a YouTube video script.

${noAttribution}

OUTPUT FORMAT (exact):
- Use Markdown section headings for each beat: "## Hook", "## Intro", "## <topic>", "## Outro".
- Under each section, write spoken narration in short, natural sentences.
- Add on-screen text and B-roll cues in square brackets, e.g. [ON SCREEN: ...] and [B-ROLL: ...].
- Include a clear hook in the first 15 seconds and a call-to-action in the outro.
- Aim for 700-1200 spoken words. No code fences.`,
      };
  }
}

// ─── Low-level completion ─────────────────────────────────
async function complete(
  system: string,
  prompt: string,
  options: { temperature?: number; maxTokens?: number },
  routes?: AiRoute[],
): Promise<{ raw: string; model: string }> {
  const useByok = Boolean(routes && routes.length > 0);
  const { router: r, routeId } = useByok
    ? await createRouterFromRoutes(routes!)
    : { router: await getRouter(), routeId: defaultRouteId };

  let res: unknown;
  try {
    res = await (
      r as { complete: (req: unknown, opts?: unknown) => Promise<unknown> }
    ).complete(
      {
        model: routeId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      },
      {
        deadlineMs: Number(process.env.AI_DEADLINE_MS) || 180_000,
      },
    );
  } catch (err) {
    console.error("[ai-router] complete() failed:", err);
    throw err;
  }

  const data = res as {
    choices: Array<{ message: { content: string | unknown[] } }>;
    model?: string;
    provider?: string;
  };

  const rawContent = data.choices?.[0]?.message?.content ?? "";
  const raw =
    typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

  // Reasoning-style models occasionally finish with an empty message (all
  // tokens spent on reasoning). Treat that as failure so the queue retries
  // instead of persisting blank content.
  if (!raw.trim()) {
    throw new Error("AI provider returned an empty response; retrying");
  }

  return { raw, model: data.model ?? data.provider ?? "unknown" };
}

// ─── Public API ───────────────────────────────────────────
export async function transformTranscript(
  req: AiTransformRequest,
  routes?: AiRoute[],
): Promise<AiTransformResponse> {
  const { raw, model } = await complete(
    "You are a senior editor and subject-matter writer. You turn raw transcripts into original, publication-ready articles written in an authoritative editorial voice. You never mention or attribute to a speaker, video, host, or transcript — you present the material as your own expert prose.",
    buildPrompt(req),
    { temperature: 0.7, maxTokens: 4096 },
    routes,
  );

  const { content, meta } = parseFrontmatter(raw);
  const summary = meta.metaDescription?.trim() || extractSummary(content) || "";

  const seo: AiSeoMeta = {
    metaTitle: (meta.metaTitle?.trim() || req.title).slice(0, 70),
    metaDescription: (meta.metaDescription?.trim() || summary).slice(0, 160),
    slug: meta.slug?.trim() || slugify(meta.metaTitle || req.title),
    keywords: meta.keywords?.length ? meta.keywords : [],
    tags: meta.tags?.length ? meta.tags : [],
  };

  return {
    content,
    summary,
    model,
    seo,
  };
}

// Transform a transcript into a repurposed format (tweet thread, newsletter,
// or video script). Returns plain content — no SEO frontmatter is generated.
export async function transformToFormat(
  req: AiTransformRequest,
  kind: DerivativeKind,
  routes?: AiRoute[],
): Promise<AiDerivativeResponse> {
  const { system, prompt } = buildDerivativePrompt(req, kind);
  const { raw, model } = await complete(
    system,
    prompt,
    { temperature: 0.7, maxTokens: 4096 },
    routes,
  );

  const content = raw
    .replace(/^\s*```[a-z]*\n/i, "")
    .replace(/\n```\s*$/i, "")
    .trim();

  return { content, model };
}

// Send a tiny request through a single route to verify the key/model work.
export interface AiRouteTestResult {
  ok: boolean;
  model: string;
  latencyMs: number;
  sample: string;
}

export async function testRoute(route: AiRoute): Promise<AiRouteTestResult> {
  const started = Date.now();
  const { raw, model } = await complete(
    "You are a connectivity check. Follow the instruction exactly.",
    "Reply with exactly the word: ok",
    { temperature: 0, maxTokens: 64 },
    [route],
  );
  return {
    ok: true,
    model,
    latencyMs: Date.now() - started,
    sample: raw.trim().slice(0, 200),
  };
}
