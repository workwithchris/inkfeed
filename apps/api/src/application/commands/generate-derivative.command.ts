import { Injectable, Logger, Inject, NotFoundException } from "@nestjs/common";
import type {
  ArticleRepository,
  DerivativeRepository,
} from "../../domain/index.js";
import type { AiTransformRequest } from "@repo/types";
import { transformToFormat } from "@repo/ai";
import { AiRouteResolver } from "../../infrastructure/ai/ai-route-resolver.js";

@Injectable()
export class GenerateDerivativeUseCase {
  private readonly logger = new Logger(GenerateDerivativeUseCase.name);

  constructor(
    @Inject("DerivativeRepository")
    private readonly derivatives: DerivativeRepository,
    @Inject("ArticleRepository") private readonly articles: ArticleRepository,
    private readonly aiRoutes: AiRouteResolver,
  ) {}

  async execute(derivativeId: string): Promise<void> {
    const derivative = await this.derivatives.findById(derivativeId);
    if (!derivative) {
      throw new NotFoundException(`Derivative ${derivativeId} not found`);
    }

    try {
      const article = await this.articles.findById(derivative.articleId);
      if (!article) {
        throw new Error("Article no longer exists");
      }

      const transcript = article.transcript?.trim();
      if (!transcript) {
        throw new Error("Article has no transcript to repurpose");
      }

      await this.derivatives.updateStatus(derivativeId, "SYNTHESIZING");
      this.logger.log(
        `Synthesizing ${derivative.kind} derivative ${derivativeId}`,
      );

      const routes = await this.aiRoutes.resolve(derivative.userId);

      const result = await transformToFormat(
        {
          transcript,
          title: article.title?.trim() || "Untitled",
        } satisfies AiTransformRequest,
        derivative.kind,
        routes,
      );

      await this.derivatives.updateContent(derivativeId, {
        content: result.content,
        aiModel: result.model,
      });
      this.logger.log(`Derivative ${derivativeId} completed`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await this.derivatives.updateStatus(derivativeId, "FAILED", msg);
      this.logger.error(`Derivative ${derivativeId} failed: ${msg}`);
      throw error;
    }
  }
}
