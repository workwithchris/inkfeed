import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type {
  Article,
  ArticleRepository,
  ConverterService,
  DerivativeRepository,
} from "../../domain/index.js";
import type { AiTransformRequest } from "@repo/types";
import type { VideoOptions } from "@repo/queue";
import { generateVideoScript, type AiVideoScene } from "@repo/ai";
import { AiRouteResolver } from "../../infrastructure/ai/ai-route-resolver.js";

function uploadRoot(): string {
  return process.env.UPLOAD_DIR || join(process.cwd(), "uploads");
}

function absoluteUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.API_PUBLIC_URL || process.env.APP_URL || "").replace(
    /\/$/,
    "",
  );
  return base ? `${base}${url}` : null;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*|__|\*|_|`|>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function clampScenes(value: number | undefined): number {
  return Math.min(Math.max(value ?? 6, 3), 10);
}

function maxScenes(options: VideoOptions): number {
  if ((options.format ?? "short") === "full") {
    return Math.min(Math.max(options.scenes ?? 24, 5), 40);
  }
  return clampScenes(options.scenes);
}

function firstWords(text: string, count: number): string {
  return text.split(/\s+/).slice(0, count).join(" ");
}

function splitSections(markdown: string): { heading: string; body: string }[] {
  const sections: { heading: string; body: string }[] = [];
  let heading = "";
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.join("\n").trim()) {
      sections.push({ heading, body: buffer.join("\n") });
    }
    buffer = [];
  };
  for (const raw of markdown.split("\n")) {
    const match = raw.trim().match(/^#{1,6}\s+(.+)$/);
    if (match) {
      flush();
      heading = match[1].trim();
    } else {
      buffer.push(raw);
    }
  }
  flush();
  return sections;
}

// Full article video: one scene per section, narrated in full.
function fullArticleScenes(article: Article, max: number): AiVideoScene[] {
  const content = article.content?.trim() || article.transcript?.trim() || "";
  let blocks = splitSections(content).filter(
    (section) => stripMarkdown(section.body).trim().length > 0,
  );

  if (blocks.length <= 1) {
    blocks = content
      .split(/\n{2,}/)
      .map((paragraph) => ({ heading: "", body: paragraph }))
      .filter((block) => stripMarkdown(block.body).trim().length > 0);
  }

  const scenes: AiVideoScene[] = [];
  for (const block of blocks) {
    const body = stripMarkdown(block.body);
    if (!body) continue;
    const caption = block.heading || firstWords(body, 7);
    scenes.push({
      text: caption.length > 90 ? `${caption.slice(0, 87)}...` : caption,
      narration: body,
    });
    if (scenes.length >= max) break;
  }
  return scenes.slice(0, max);
}

// Split arbitrary script text (custom or a derivative) into scenes.
function scenesFromText(text: string, max: number): AiVideoScene[] {
  const blocks = text
    .replace(/\[[^\]]*\]/g, " ")
    .split(/\n(?=#{1,6}\s)|\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const scenes: AiVideoScene[] = [];
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const caption = lines[0].replace(/^#{1,6}\s*/, "").trim();
    const narration = lines.join(" ").trim();
    if (caption) {
      scenes.push({
        text: caption.length > 90 ? `${caption.slice(0, 87)}...` : caption,
        narration,
      });
    }
  }

  if (scenes.length === 0) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      scenes.push({
        text: sentence.length > 90 ? `${sentence.slice(0, 87)}...` : sentence,
        narration: sentence,
      });
    }
  }

  return scenes.slice(0, max);
}

function fallbackScenes(article: Article, max: number): AiVideoScene[] {
  const scenes: AiVideoScene[] = [];
  const title = article.title?.trim();
  if (title && title !== "Untitled Video") {
    scenes.push({ text: title, narration: title });
  }

  const source = (article.summary?.trim() || stripMarkdown(article.content)).trim();
  const sentences = source
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, Math.max(max - 2, 1));
  for (const sentence of sentences) {
    scenes.push({
      text: sentence.length > 90 ? `${sentence.slice(0, 87)}...` : sentence,
      narration: sentence,
    });
  }
  return scenes.slice(0, max);
}

@Injectable()
export class GenerateVideoUseCase {
  private readonly logger = new Logger(GenerateVideoUseCase.name);

  constructor(
    @Inject("ArticleRepository") private readonly articles: ArticleRepository,
    @Inject("DerivativeRepository")
    private readonly derivatives: DerivativeRepository,
    @Inject("ConverterService") private readonly converter: ConverterService,
    private readonly aiRoutes: AiRouteResolver,
  ) {}

  async execute(articleId: string, options: VideoOptions = {}): Promise<void> {
    const article = await this.articles.findById(articleId);
    if (!article) {
      throw new NotFoundException(`Article ${articleId} not found`);
    }

    try {
      await this.articles.updateVideo(articleId, { status: "RENDERING" });

      const max = maxScenes(options);
      const scenes = await this.resolveScenes(article, options, max);

      const cta = options.cta?.trim();
      if (cta) scenes.push({ text: cta, narration: cta });

      this.logger.log(
        `Rendering ${scenes.length}-scene video (${options.aspect ?? "9:16"}, ${
          options.theme ?? "ink"
        }) for article ${articleId}`,
      );

      const background = options.background ?? "gradient";
      const providedImages = (options.imageUrls ?? []).filter(Boolean);
      const images =
        providedImages.length > 0
          ? providedImages
          : background === "cover" && article.coverImageUrl
            ? [article.coverImageUrl]
            : [];

      const buffer = await this.converter.renderVideo({
        title: article.title?.trim() || "Untitled",
        scenes,
        author: article.channel,
        subtitle: null,
        coverUrl:
          background === "cover" ? absoluteUrl(article.coverImageUrl) : null,
        imageUrls: images
          .map((url) => absoluteUrl(url))
          .filter((url): url is string => Boolean(url)),
        aspect: options.aspect ?? "9:16",
        theme: options.theme ?? "ink",
        quality: options.quality ?? "final",
        voice: options.voice || process.env.VIDEO_VOICE || null,
        voiceRate: options.voiceRate,
        voicePitch: options.voicePitch,
        kenBurns: options.kenBurns ?? false,
        transition: options.transition ?? "none",
        musicUrl: absoluteUrl(options.musicUrl ?? null),
        musicVolume: options.musicVolume ?? 20,
        font: options.font ?? "sans",
        textColor: options.textColor ?? null,
        textPosition: options.textPosition ?? "center",
        uppercase: options.uppercase ?? false,
        watermark: options.watermark ?? true,
        watermarkText: options.watermarkText ?? null,
      });

      const dir = join(uploadRoot(), "videos");
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${articleId}.mp4`), buffer);

      await this.articles.updateVideo(articleId, {
        status: "READY",
        // Version query busts the immutable browser cache on re-render.
        videoUrl: `/api/media/videos/${articleId}.mp4?v=${Date.now()}`,
        error: null,
      });
      this.logger.log(`Video ready for article ${articleId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await this.articles.updateVideo(articleId, {
        status: "FAILED",
        error: message,
      });
      this.logger.error(`Video failed for ${articleId}: ${message}`);
      throw error;
    }
  }

  // Resolve the script/scenes for preview (no rendering).
  async preview(
    articleId: string,
    options: VideoOptions = {},
  ): Promise<AiVideoScene[]> {
    const article = await this.articles.findById(articleId);
    if (!article) {
      throw new NotFoundException(`Article ${articleId} not found`);
    }
    return this.resolveScenes(article, options, maxScenes(options));
  }

  private async resolveScenes(
    article: Article,
    options: VideoOptions,
    max: number,
  ): Promise<AiVideoScene[]> {
    const source = options.scriptSource ?? "auto";

    if (source === "custom") {
      const text = options.customScript?.trim();
      if (text) {
        const scenes = scenesFromText(text, max);
        if (scenes.length > 0) return scenes;
      }
    }

    // Full article video narrates the whole piece, section by section.
    if ((options.format ?? "short") === "full") {
      return fullArticleScenes(article, max);
    }

    if (source !== "rewrite") {
      try {
        const derivatives = await this.derivatives.findByArticleId(article.id);
        const script = derivatives.find(
          (d) =>
            d.kind === "video_script" &&
            d.status === "COMPLETED" &&
            d.content?.trim(),
        );
        if (script?.content) {
          const scenes = scenesFromText(script.content, max);
          if (scenes.length > 0) return scenes;
        }
      } catch (error) {
        this.logger.warn(
          `Could not load video script: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    const material = article.content?.trim() || article.transcript?.trim();
    if (material) {
      try {
        const routes = await this.aiRoutes.resolve(article.userId);
        const scenes = await generateVideoScript(
          {
            transcript: material,
            title: article.title?.trim() || "Untitled",
          } satisfies AiTransformRequest,
          routes,
        );
        if (scenes.length > 0) return scenes.slice(0, max);
      } catch (error) {
        this.logger.warn(
          `AI script generation failed, using fallback: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    return fallbackScenes(article, max);
  }
}
