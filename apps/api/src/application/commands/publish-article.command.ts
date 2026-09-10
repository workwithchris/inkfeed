import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import type {
  ArticleRepository,
  ConnectionRepository,
  PublishRepository,
} from "../../domain/index";
import { PublisherRegistry } from "../../infrastructure/publishers/publisher.registry";
import { decryptSecret } from "../../infrastructure/crypto/secret-box";

export interface PublishOutcome {
  articleId: string;
  publicationId: string;
  url: string;
}

// Dev.to rejects canonical URLs that aren't publicly reachable (e.g. localhost),
// so omit the field entirely in local dev instead of failing the publish.
function buildCanonicalUrl(slugOrId: string): string | null {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!appUrl) return null;
  try {
    const { hostname } = new URL(appUrl);
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local")
    ) {
      return null;
    }
    return `${appUrl}/article/${slugOrId}`;
  } catch {
    return null;
  }
}

@Injectable()
export class PublishArticleUseCase {
  constructor(
    @Inject("PublishRepository")
    private readonly publications: PublishRepository,
    @Inject("ConnectionRepository")
    private readonly connections: ConnectionRepository,
    @Inject("ArticleRepository")
    private readonly articles: ArticleRepository,
    private readonly registry: PublisherRegistry,
  ) {}

  async execute(
    publicationId: string,
    includeCoverImage = true,
  ): Promise<PublishOutcome> {
    const publication = await this.publications.findById(publicationId);
    if (!publication) {
      throw new NotFoundException(`Publication ${publicationId} not found`);
    }

    await this.publications.updateStatus(publicationId, {
      status: "PUBLISHING",
    });

    try {
      const connection = await this.connections.findById(
        publication.connectionId,
      );
      const article = await this.articles.findById(publication.articleId);
      if (!connection || !article) {
        throw new Error("Connection or article no longer exists");
      }

      const publisher = this.registry.get(publication.platform);
      const credential = decryptSecret(connection.credentialEnc);

      const canonicalUrl = buildCanonicalUrl(
        article.slug ?? article.id,
      );

      const result = await publisher.publish(credential, connection.blogId, {
        title: article.title,
        content: article.content,
        summary: article.summary,
        tags: article.tags ?? [],
        canonicalUrl,
        coverImageUrl: includeCoverImage ? article.coverImageUrl : null,
      });

      await this.publications.updateStatus(publicationId, {
        status: "PUBLISHED",
        externalId: result.externalId,
        externalUrl: result.url,
        errorMessage: null,
      });

      return { articleId: article.id, publicationId, url: result.url };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown publish error";
      await this.publications.updateStatus(publicationId, {
        status: "FAILED",
        errorMessage: message,
      });
      throw error;
    }
  }
}
