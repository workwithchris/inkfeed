import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import type { ArticleRepository } from "../../domain/index";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Unauthenticated read-only view of a completed article, addressed by slug or id.
@Controller("api/public/articles")
export class PublicArticleController {
  constructor(
    @Inject("ArticleRepository")
    private readonly articles: ArticleRepository,
  ) {}

  @Get(":slugOrId")
  async findOne(@Param("slugOrId") slugOrId: string) {
    const article = UUID.test(slugOrId)
      ? await this.articles.findById(slugOrId)
      : await this.articles.findBySlug(slugOrId);

    if (!article || article.status !== "COMPLETED") {
      throw new NotFoundException("Article not found");
    }

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      content: article.content,
      summary: article.summary,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      keywords: article.keywords,
      tags: article.tags,
      coverImageUrl: article.coverImageUrl,
      channel: article.channel,
      readingTimeMinutes: article.readingTimeMinutes,
      youtubeUrl: article.youtubeUrl,
      createdAt: article.createdAt,
    };
  }
}
