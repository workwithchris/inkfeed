import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import type {
  Article,
  ArticleRepository,
  EditableContentData,
} from "../../domain/index";

@Injectable()
export class UpdateArticleUseCase {
  constructor(
    @Inject("ArticleRepository")
    private readonly articles: ArticleRepository,
  ) {}

  async execute(
    articleId: string,
    userId: string,
    data: EditableContentData,
  ): Promise<Article> {
    const article = await this.articles.findById(articleId);
    if (!article) {
      throw new NotFoundException(`Article ${articleId} not found`);
    }
    if (article.userId !== userId) {
      throw new ForbiddenException("Not your article");
    }

    // Keep reading time in sync when the body changes.
    const patch: EditableContentData = { ...data };
    if (patch.content !== undefined) {
      const words = patch.content.trim().split(/\s+/).filter(Boolean).length;
      patch.readingTimeMinutes =
        words > 0 ? Math.max(1, Math.round(words / 200)) : null;
    }

    await this.articles.updateEditable(articleId, patch);
    return (await this.articles.findById(articleId))!;
  }
}
