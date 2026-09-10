import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import type { ArticleRepository, Article } from "../../domain/index";

@Injectable()
export class GetArticleQuery {
  constructor(@Inject("ArticleRepository") private readonly articleRepo: ArticleRepository) {}

  async execute(articleId: string): Promise<Article> {
    const article = await this.articleRepo.findById(articleId);
    if (!article) {
      throw new NotFoundException(`Article ${articleId} not found`);
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
