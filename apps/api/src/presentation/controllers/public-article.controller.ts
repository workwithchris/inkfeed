import {
  Controller,
  Get,
  Param,
  Inject,
  NotFoundException,
} from "@nestjs/common";
import type {
  ArticleRepository,
  PublishRepository,
  UserRepository,
} from "../../domain/index";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Unauthenticated read-only view of a completed article, addressed by slug or id.
@Controller("api/public/articles")
export class PublicArticleController {
  constructor(
    @Inject("ArticleRepository")
    private readonly articles: ArticleRepository,
    @Inject("PublishRepository")
    private readonly publications: PublishRepository,
    @Inject("UserRepository")
    private readonly users: UserRepository,
  ) {}

  @Get(":slugOrId")
  async findOne(@Param("slugOrId") slugOrId: string) {
    const article = UUID.test(slugOrId)
      ? await this.articles.findById(slugOrId)
      : await this.articles.findBySlug(slugOrId);

    if (!article || article.status !== "COMPLETED") {
      throw new NotFoundException("Article not found");
    }

    // Only articles explicitly published to the built-in site are public.
    const publications = await this.publications.findByArticleId(article.id);
    const live = publications.some(
      (p) => p.platform === "site" && p.status === "PUBLISHED",
    );
    if (!live) {
      throw new NotFoundException("Article not found");
    }

    const author = await this.users.findById(article.userId);

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
      sourceType: article.sourceType,
      sourceUrl: article.sourceUrl,
      sourceItemUrl: article.sourceItemUrl,
      youtubeUrl: article.youtubeUrl,
      createdAt: article.createdAt,
      authorUsername: author?.username ?? null,
      authorName: author?.name ?? null,
    };
  }
}
