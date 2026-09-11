import { Injectable, Logger } from "@nestjs/common";
import type {
  BlogPublisher,
  PublishDraft,
  PublishResult,
  PublishPlatform,
} from "../../domain/index.js";
import {
  ensureGitHubRepo,
  GitHubPublishError,
  publishArticleToGitHub,
} from "../github/github.js";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || "untitled"
  );
}

@Injectable()
export class GitHubPublisher implements BlogPublisher {
  readonly platform: PublishPlatform = "github";
  private readonly logger = new Logger(GitHubPublisher.name);

  // `credential` is a GitHub PAT. Ensures the target repo exists (creating it
  // once, if needed) and returns its `owner/repo`.
  async validate(
    credential: string,
    blogId?: string | null,
  ): Promise<{
    blogId: string | null;
    blogName: string | null;
  }> {
    const repoName = blogId?.split("/")[1];
    const { fullName } = await ensureGitHubRepo(credential, repoName);
    return { blogId: fullName, blogName: fullName };
  }

  async publish(
    credential: string,
    blogId: string | null,
    draft: PublishDraft,
  ): Promise<PublishResult> {
    if (!blogId) {
      throw new Error("GitHub connection is missing a repository");
    }
    const [owner, repo] = blogId.split("/");
    const slug = draft.slug?.trim() || slugify(draft.title);
    try {
      const result = await publishArticleToGitHub({
        token: credential,
        owner,
        repo,
        title: draft.title || "Untitled",
        content: draft.content,
        tags: draft.tags,
        slug,
        description: draft.summary ?? undefined,
      });
      return {
        externalId: result.commitSha ?? result.path,
        url: result.url,
      };
    } catch (error) {
      if (error instanceof GitHubPublishError) {
        this.logger.warn(`GitHub publish failed (${error.status}): ${error.message}`);
      }
      throw error;
    }
  }
}
