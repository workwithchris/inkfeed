import { Injectable, Logger } from "@nestjs/common";
import type {
  BlogPublisher,
  PublishDraft,
  PublishResult,
  PublishPlatform,
} from "../../domain/index";
import {
  createLinkedInArticlePost,
  getLinkedInMember,
  uploadLinkedInImage,
} from "../oauth/linkedin";

@Injectable()
export class LinkedInPublisher implements BlogPublisher {
  readonly platform: PublishPlatform = "linkedin";
  private readonly logger = new Logger(LinkedInPublisher.name);

  // `credential` is a 60-day member access token.
  async validate(credential: string): Promise<{
    blogId: string | null;
    blogName: string | null;
  }> {
    const member = await getLinkedInMember(credential);
    return { blogId: `urn:li:person:${member.sub}`, blogName: member.name };
  }

  async publish(
    credential: string,
    blogId: string | null,
    draft: PublishDraft,
  ): Promise<PublishResult> {
    if (!blogId) {
      throw new Error("LinkedIn connection is missing the member urn");
    }
    if (!draft.canonicalUrl) {
      throw new Error(
        "LinkedIn needs a public article URL. Set APP_URL to your public domain, then retry.",
      );
    }

    let thumbnailUrn: string | null = null;
    if (draft.coverImageUrl) {
      thumbnailUrn = await uploadLinkedInImage(
        credential,
        blogId,
        draft.coverImageUrl,
      ).catch((err) => {
        this.logger.warn(`LinkedIn thumbnail upload failed: ${err}`);
        return null;
      });
    }

    const result = await createLinkedInArticlePost(credential, blogId, {
      source: draft.canonicalUrl,
      title: draft.title || "Untitled",
      description: draft.summary?.slice(0, 250) ?? "",
      thumbnailUrn,
      commentary: draft.summary?.slice(0, 200) || draft.title || "",
    });
    return { externalId: result.id, url: result.url };
  }
}
