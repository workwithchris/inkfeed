import { Controller, Get, Query, Inject } from "@nestjs/common";
import type { ArticleRepository } from "../../domain/index.js";

// Unauthenticated global feed of every article published to the built-in site.
@Controller("api/public/feed")
export class PublicFeedController {
  constructor(
    @Inject("ArticleRepository") private readonly articles: ArticleRepository,
  ) {}

  @Get()
  async list(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("tag") tag?: string,
  ) {
    const parsedLimit = parseInt(limit ?? "12", 10);
    const parsedOffset = parseInt(offset ?? "0", 10);
    const take = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 50)
      : 12;
    const skip = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    const { items, total } = await this.articles.findSitePublishedFeed({
      limit: take,
      offset: skip,
      tag: tag?.trim() || undefined,
    });

    return {
      total,
      limit: take,
      offset: skip,
      items: items.map(({ article, authorUsername, authorName }) => ({
        id: article.id,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        coverImageUrl: article.coverImageUrl,
        tags: article.tags,
        readingTimeMinutes: article.readingTimeMinutes,
        channel: article.channel,
        sourceType: article.sourceType,
        createdAt: article.createdAt,
        authorUsername,
        authorName,
      })),
    };
  }
}
