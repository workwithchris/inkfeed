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

    await this.articles.updateEditable(articleId, data);
    return (await this.articles.findById(articleId))!;
  }
}
