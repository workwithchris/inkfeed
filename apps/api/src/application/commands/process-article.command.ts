import { Injectable, Logger, Inject } from "@nestjs/common";
import type {
  ArticleRepository,
  ConverterService,
  AiProviderRepository,
} from "../../domain/index";
import type { AiTransformRequest, AiRoute } from "@repo/types";
import { transformTranscript } from "@repo/ai";
import { decryptSecret } from "../../infrastructure/crypto/secret-box";
import { resolveYouTubeCover } from "../../infrastructure/media/youtube-cover";

// OpenCode Zen's gateway rejects requests without a session id header. The
// env-based router attaches the same header (see @repo/ai).
const OPENCODE_SESSION = `youtube-to-article-${Date.now()}`;

function routeHeadersFor(
  baseUrl: string | null,
): Record<string, string> | undefined {
  if (!baseUrl) return undefined;
  try {
    const host = new URL(baseUrl).hostname;
    if (host === "opencode.ai" || host.endsWith(".opencode.ai")) {
      return {
        "x-opencode-session": OPENCODE_SESSION,
        "user-agent": "youtube-to-article/1.0",
      };
    }
  } catch {
    // Ignore malformed base URLs; the router will surface the error.
  }
  return undefined;
}

@Injectable()
export class ProcessArticleUseCase {
  private readonly logger = new Logger(ProcessArticleUseCase.name);

  constructor(
    @Inject("ArticleRepository") private readonly articleRepo: ArticleRepository,
    @Inject("ConverterService") private readonly converter: ConverterService,
    @Inject("AiProviderRepository")
    private readonly providers: AiProviderRepository,
  ) {}

  async execute(
    articleId: string,
    options: { reuseTranscript?: boolean } = {},
  ): Promise<void> {
    const article = await this.articleRepo.findById(articleId);
    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    try {
      let transcript: string;
      let title: string;

      // Regeneration reuses the transcript already stored on the article so we
      // don't hit the converter again.
      if (options.reuseTranscript && article.transcript) {
        transcript = article.transcript;
        title = article.title?.trim() || "Untitled";
      } else {
        // Step 1: Extract transcript
        await this.articleRepo.updateStatus(articleId, "EXTRACTING");
        this.logger.log(`Extracting transcript for article ${articleId}`);

        const extracted = await this.converter.extractTranscript(
          article.youtubeUrl,
        );

        title = article.title?.trim() || extracted.title;

        await this.articleRepo.updateTranscript(articleId, {
          title,
          transcript: extracted.transcript,
          durationSeconds: extracted.durationSeconds,
          channel: article.channel?.trim() || extracted.channel,
        });

        transcript = extracted.transcript;
      }

      // Step 2: AI transformation
      await this.articleRepo.updateStatus(articleId, "SYNTHESIZING");
      this.logger.log(`Synthesizing article for ${articleId}`);

      const coverImageUrl = await resolveYouTubeCover(article.videoId).catch(
        () => null,
      );

      const routes = await this.resolveAiRoutes(article.userId);

      const aiResult = await transformTranscript({
        transcript,
        title,
        style: "blog",
      } satisfies AiTransformRequest, routes);

      const words = aiResult.content.trim().split(/\s+/).filter(Boolean).length;
      const readingTimeMinutes = Math.max(1, Math.round(words / 200));

      await this.articleRepo.updateContent(articleId, {
        content: aiResult.content,
        summary: aiResult.summary,
        aiModel: aiResult.model,
        metaTitle: aiResult.seo.metaTitle,
        metaDescription: aiResult.seo.metaDescription,
        slug: aiResult.seo.slug,
        keywords: aiResult.seo.keywords,
        tags: aiResult.seo.tags,
        readingTimeMinutes,
        coverImageUrl,
      });

      await this.articleRepo.markCompleted(articleId);
      this.logger.log(`Article ${articleId} completed`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await this.articleRepo.markFailed(articleId, msg);
      this.logger.error(`Article ${articleId} failed: ${msg}`);
      throw error;
    }
  }

  // BYOK: prefer the user's enabled providers; fall back to env defaults.
  private async resolveAiRoutes(userId: string): Promise<AiRoute[] | undefined> {
    const providers = await this.providers.findEnabledByUserId(userId);
    if (providers.length === 0) return undefined;

    return providers.map((p) => {
      const headers = routeHeadersFor(p.baseUrl);
      return {
        id: p.id,
        provider: p.provider,
        model: p.model,
        apiKey: decryptSecret(p.apiKeyEnc),
        ...(p.baseUrl ? { baseUrl: p.baseUrl } : {}),
        ...(headers ? { headers } : {}),
      };
    });
  }
}
