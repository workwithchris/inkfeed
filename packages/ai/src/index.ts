import type {
  AiTransformRequest,
  AiTransformResponse,
  AiSeoMeta,
} from "@repo/types";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// ─── Lazy-loaded router (ESM dynamic import from CJS host) ─
let routerPromise: Promise<{ AIRouter: new (config: unknown) => unknown }> | null = null;
let routerInstance: unknown = null;
let defaultRouteId: string | null = null;

// Resolve physical path to @ai-router/core/dist/index.js
// CJS require can't find it (no "require" export), so we locate it manually
function resolveAiRouterPath(): string {
  // Walk up from this file to find node_modules/@ai-router/core
  let dir = __dirname;
  while (dir !== "/") {
    const candidate = join(dir, "node_modules", "@ai-router", "core", "dist", "index.js");
    try {
      // Verify file exists
      require("fs").accessSync(candidate);
      return candidate;
    } catch {
      dir = dirname(dir);
    }
  }
  throw new Error("Cannot find @ai-router/core in node_modules");
}

async function getRouter(): Promise<unknown> {
  if (routerInstance) return routerInstance;

  if (!routerPromise) {
    const modPath = resolveAiRouterPath();
    routerPromise = import(modPath) as Promise<{ AIRouter: new (config: unknown) => unknown }>;
  }
  const { AIRouter } = await routerPromise;

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
        "x-opencode-session": "youtube-to-article-" + Date.now(),
        "user-agent": "youtube-to-article/1.0",
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

// ─── Prompt builder ───────────────────────────────────────
function buildPrompt(req: AiTransformRequest): string {
  const style = req.style || "blog";
  const styleInstructions: Record<string, string> = {
    blog: "Write a polished blog post.",
    newsletter: "Write a newsletter-style article with a hook intro, key takeaways, and a concise wrap-up.",
    academic: "Write a formal academic summary with structured sections and objective tone.",
  };

  return `You are an expert content writer and SEO editor. Transform this YouTube video transcript into a well-structured, publish-ready ${style} article.

Video Title: "${req.title}"

${styleInstructions[style]}

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
- Use H2 (##) for main sections, H3 (###) for subsections
- Keep paragraphs short (2-4 sentences max)
- Use **bold** for key terms and concepts
- Use bullet lists (- item) for enumeration
- Use blockquotes (>) for notable quotes or highlights
- Include a "Key Takeaways" section at the end
- NO TL;DR section in the body (a summary is generated separately)
- NO timestamps, NO speaker labels, NO "[Music]" or similar tags
- Write 800-1500 words

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

// ─── Public API ───────────────────────────────────────────
export async function transformTranscript(
  req: AiTransformRequest,
): Promise<AiTransformResponse> {
  const r = await getRouter();
  const prompt = buildPrompt(req);

  console.log("[ai-router] calling with route:", defaultRouteId);
  console.log("[ai-router] OPENROUTER_API_KEY set:", !!process.env.OPENROUTER_API_KEY);

  let res: unknown;
  try {
    res = await (r as { complete: (req: unknown, opts?: unknown) => Promise<unknown> }).complete({
      model: defaultRouteId,
      messages: [
        {
          role: "system",
          content:
            "You are an expert content writer. Transform YouTube transcripts into polished, well-structured articles.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }, { deadlineMs: 60_000 });
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
    model: data.model ?? data.provider ?? "unknown",
    seo,
  };
}
