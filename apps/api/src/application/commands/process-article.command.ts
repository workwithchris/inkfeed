import { Injectable, Logger, Inject } from "@nestjs/common";
import type {
  ArticleRepository,
  ConverterService,
} from "../../domain/index";
import type { AiTransformRequest } from "@repo/types";
import { transformTranscript } from "@repo/ai";
import { resolveYouTubeCover } from "../../infrastructure/media/youtube-cover";

@Injectable()
export class ProcessArticleUseCase {
  private readonly logger = new Logger(ProcessArticleUseCase.name);

  constructor(
    @Inject("ArticleRepository") private readonly articleRepo: ArticleRepository,
    @Inject("ConverterService") private readonly converter: ConverterService,
  ) {}

  async execute(articleId: string): Promise<void> {
    const article = await this.articleRepo.findById(articleId);
    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    // Step 1: Extract transcript
    await this.articleRepo.updateStatus(articleId, "EXTRACTING");
    this.logger.log(`Extracting transcript for article ${articleId}`);

    try {
      const extracted = await this.converter.extractTranscript(
        article.youtubeUrl,
      );

      await this.articleRepo.updateTranscript(articleId, {
        title: article.title?.trim() || extracted.title,
        transcript: extracted.transcript,
        durationSeconds: extracted.durationSeconds,
        channel: article.channel?.trim() || extracted.channel,
      });

      // Step 2: AI transformation
      await this.articleRepo.updateStatus(articleId, "SYNTHESIZING");
      this.logger.log(`Synthesizing article for ${articleId}`);

      const coverImageUrl = await resolveYouTubeCover(article.videoId).catch(
        () => null,
      );

      const aiResult = await transformTranscript({
        transcript: extracted.transcript,
        title: extracted.title,
        style: "blog",
      } satisfies AiTransformRequest);

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
}
