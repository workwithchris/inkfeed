import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import type { ArticleRepository, Article } from "../../domain/index.js";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class GetArticleQuery {
  constructor(@Inject("ArticleRepository") private readonly articleRepo: ArticleRepository) {}

  async execute(idOrSlug: string): Promise<Article> {
    const article = UUID.test(idOrSlug)
      ? await this.articleRepo.findById(idOrSlug)
      : await this.articleRepo.findBySlug(idOrSlug);
    if (!article) {
      throw new NotFoundException(`Article ${idOrSlug} not found`);
    }
    return article;
  }
}

@Injectable()
export class ListArticlesQuery {
  constructor(@Inject("ArticleRepository") private readonly articleRepo: ArticleRepository) {}

  async execute(userId: string): Promise<Article[]> {
    return this.articleRepo.findByUserId(userId);
  }
}
