import { Injectable, Logger } from "@nestjs/common";
import type {
  BlogPublisher,
  PublishDraft,
  PublishResult,
  PublishPlatform,
} from "../../domain/index";

const GQL = "https://gql.hashnode.com";

interface PublicationsResponse {
  data?: {
    me?: {
      publications?: {
        edges?: Array<{ node: { id: string; title: string; url: string } }>;
      };
    };
  };
  errors?: Array<{ message: string }>;
}

interface PublishPostResponse {
  data?: {
    publishPost?: { post: { id: string; url: string; slug: string } };
  };
  errors?: Array<{ message: string }>;
}

@Injectable()
export class HashnodePublisher implements BlogPublisher {
  readonly platform: PublishPlatform = "hashnode";
  private readonly logger = new Logger(HashnodePublisher.name);

  private async gql<T>(
    credential: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(GQL, {
      method: "POST",
      headers: {
        Authorization: credential,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("application/json")) {
      const body = await res.text().catch(() => "");
      const needsPro =
        body.includes("paid") ||
        body.includes("GraphQL API") ||
        res.url.includes("paid-access");
      if (needsPro) {
        throw new Error(
          "Hashnode's GraphQL API now requires a Pro plan on your publication (free API retired May 2026). Upgrade the blog, or use Dev.to instead.",
        );
      }
      throw new Error(`Hashnode request failed (${res.status})`);
    }
    return (await res.json()) as T;
  }

  async validate(credential: string): Promise<{
    blogId: string | null;
    blogName: string | null;
  }> {
    const json = await this.gql<PublicationsResponse>(
      credential,
      `query { me { publications(first: 20) { edges { node { id title url } } } } }`,
      {},
    );
    const node = json.data?.me?.publications?.edges?.[0]?.node;
    if (!node) {
      const gqlError = json.errors?.[0]?.message;
      if (gqlError) throw new Error(`Hashnode: ${gqlError}`);
      throw new Error(
        "No Hashnode publication found. Create a blog on Hashnode first.",
      );
    }
    return { blogId: node.id, blogName: node.title };
  }

  async publish(
    credential: string,
    blogId: string | null,
    draft: PublishDraft,
  ): Promise<PublishResult> {
    if (!blogId) {
      throw new Error("Hashnode connection is missing a publication id");
    }

    const json = await this.gql<PublishPostResponse>(
      credential,
      `mutation PublishPost($input: PublishPostInput!) {
         publishPost(input: $input) { post { id url slug } }
       }`,
      {
        input: {
          publicationId: blogId,
          title: draft.title || "Untitled",
          contentMarkdown: draft.content,
          ...(draft.summary ? { subtitle: draft.summary.slice(0, 250) } : {}),
          ...(draft.coverImageUrl
            ? { coverImageOptions: { coverImageURL: draft.coverImageUrl } }
            : {}),
          ...(draft.canonicalUrl ? { canonicalUrl: draft.canonicalUrl } : {}),
        },
      },
    );

    const post = json.data?.publishPost?.post;
    if (!post) {
      const msg = json.errors?.[0]?.message ?? "Unknown Hashnode error";
      this.logger.error(`Hashnode publish failed: ${msg}`);
      throw new Error(`Hashnode publish failed: ${msg}`);
    }
    return { externalId: post.id, url: post.url };
  }
}
