import { Injectable } from "@nestjs/common";
import { SITE_PLATFORM_LABEL } from "@repo/types";
import type {
  BlogPublisher,
  PublishDraft,
  PublishResult,
  PublishPlatform,
} from "../../domain/index.js";
import { articleUrl } from "./public-urls.js";

// Built-in destination: "publishes" to this app's own public article page.
// There is no external API — the side effect is that the article becomes
// publicly readable once a site publication is marked PUBLISHED
// (see PublicArticleController).
@Injectable()
export class SitePublisher implements BlogPublisher {
  readonly platform: PublishPlatform = "site";

  async validate(): Promise<{
    blogId: string | null;
    blogName: string | null;
  }> {
    return { blogId: null, blogName: SITE_PLATFORM_LABEL };
  }

  async publish(
    _credential: string,
    _blogId: string | null,
    draft: PublishDraft,
  ): Promise<PublishResult> {
    const slugOrId = draft.slug ?? draft.articleId;
    const url = articleUrl(draft.username, slugOrId);
    if (!url) {
      throw new Error("APP_URL or APP_DOMAIN is not configured");
    }
    return { externalId: draft.articleId, url };
  }
}
