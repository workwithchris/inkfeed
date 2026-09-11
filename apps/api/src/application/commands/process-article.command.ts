import { Injectable, Logger, Inject } from "@nestjs/common";
import type {
  Article,
  ArticleRepository,
  ConverterService,
  ExtractedContent,
} from "../../domain/index";
import type { AiTransformRequest } from "@repo/types";
import { transformTranscript } from "@repo/ai";
import { resolveYouTubeCover } from "../../infrastructure/media/youtube-cover";
import { AiRouteResolver } from "../../infrastructure/ai/ai-route-resolver";

@Injectable()
export class ProcessArticleUseCase {
  private readonly logger = new Logger(ProcessArticleUseCase.name);

  constructor(
    @Inject("ArticleRepository") private readonly articleRepo: ArticleRepository,
    @Inject("ConverterService") private readonly converter: ConverterService,
    private readonly aiRoutes: AiRouteResolver,
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
        // Step 1: Extract source content
        await this.articleRepo.updateStatus(articleId, "EXTRACTING");
        this.logger.log(`Extracting ${article.sourceType} source for ${articleId}`);

        const extracted = await this.extractSource(article);

        title = article.title?.trim() || extracted.title;

        await this.articleRepo.updateTranscript(articleId, {
          title,
          transcript: extracted.text,
          durationSeconds: extracted.durationSeconds,
          channel: article.channel?.trim() || extracted.channel,
        });

        transcript = extracted.text;
      }

      // Step 2: AI transformation
      await this.articleRepo.updateStatus(articleId, "SYNTHESIZING");
      this.logger.log(`Synthesizing article for ${articleId}`);

      const coverImageUrl = await resolveYouTubeCover(article.videoId).catch(
        () => null,
      );

      const routes = await this.aiRoutes.resolve(article.userId);
      const aiSource: "user" | "platform" =
        routes && routes.length > 0 ? "user" : "platform";

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
        aiSource,
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

  private async extractSource(article: Article): Promise<ExtractedContent> {
    switch (article.sourceType) {
      case "url":
        if (!article.sourceUrl) throw new Error("Source URL is missing");
        return this.converter.extractUrl(article.sourceUrl);

      case "feed":
        if (!article.sourceUrl || !article.sourceItemUrl) {
          throw new Error("Feed source is missing a feed or episode URL");
        }
        return this.converter.extractFeedItem({
          feedUrl: article.sourceUrl,
          itemUrl: article.sourceItemUrl,
        });

      case "document":
        throw new Error("Document source has no stored content");

      default:
        return this.converter.extractUrl(article.youtubeUrl);
    }
  }
}
