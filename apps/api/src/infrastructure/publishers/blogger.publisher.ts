import { Injectable } from "@nestjs/common";
import type {
  BlogPublisher,
  PublishDraft,
  PublishResult,
  PublishPlatform,
} from "../../domain/index.js";
import {
  listBloggerBlogs,
  refreshGoogleAccessToken,
} from "../oauth/google-blogger.js";
import { markdownToHtml } from "../markdown/to-html.js";

const BLOGGER_API = "https://www.googleapis.com/blogger/v3";

@Injectable()
export class BloggerPublisher implements BlogPublisher {
  readonly platform: PublishPlatform = "blogger";

  // `credential` is the long-lived Google refresh token.
  async validate(credential: string): Promise<{
    blogId: string | null;
    blogName: string | null;
  }> {
    const accessToken = await refreshGoogleAccessToken(credential);
    const blogs = await listBloggerBlogs(accessToken);
    if (blogs.length === 0) {
      throw new Error("No Blogger blog found on this Google account");
    }
    return { blogId: blogs[0].id, blogName: blogs[0].name };
  }

  async publish(
    credential: string,
    blogId: string | null,
    draft: PublishDraft,
  ): Promise<PublishResult> {
    if (!blogId) {
      throw new Error("Blogger connection is missing a blog id");
    }

    const accessToken = await refreshGoogleAccessToken(credential);

    const res = await fetch(
      `${BLOGGER_API}/blogs/${blogId}/posts/?isDraft=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title || "Untitled",
          content: draft.coverImageUrl
            ? `<img src="${draft.coverImageUrl}" alt="" style="max-width:100%;height:auto"/>\n${markdownToHtml(
                draft.content,
              )}`
            : markdownToHtml(draft.content),
        }),
      },
    );

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.id) {
      throw new Error(
        json.error?.message || `Blogger publish failed (${res.status})`,
      );
    }
    return { externalId: json.id, url: json.url ?? "" };
  }
}
