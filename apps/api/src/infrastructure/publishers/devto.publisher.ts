import { Injectable, Logger } from "@nestjs/common";
import type {
  BlogPublisher,
  PublishDraft,
  PublishResult,
  PublishPlatform,
} from "../../domain/index.js";

const API = "https://dev.to/api";

@Injectable()
export class DevtoPublisher implements BlogPublisher {
  readonly platform: PublishPlatform = "devto";
  private readonly logger = new Logger(DevtoPublisher.name);

  async validate(credential: string): Promise<{
    blogId: string | null;
    blogName: string | null;
  }> {
    const res = await fetch(`${API}/users/me`, {
      headers: { "api-key": credential, Accept: "application/json" },
    });
    if (!res.ok) {
      throw new Error(
        res.status === 401
          ? "Dev.to rejected the API key (401). Check the key."
          : `Dev.to request failed (${res.status})`,
      );
    }
    const data = (await res.json().catch(() => ({}))) as {
      name?: string;
      username?: string;
    };
    return { blogId: null, blogName: data.username ?? data.name ?? "dev.to" };
  }

  async publish(
    credential: string,
    _blogId: string | null,
    draft: PublishDraft,
  ): Promise<PublishResult> {
    const tags = draft.tags
      .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
      .filter(Boolean)
      .slice(0, 4);

    const res = await fetch(`${API}/articles`, {
      method: "POST",
      headers: {
        "api-key": credential,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        article: {
          title: draft.title || "Untitled",
          body_markdown: draft.content,
          published: false,
          tags,
          ...(draft.coverImageUrl ? { main_image: draft.coverImageUrl } : {}),
          ...(draft.canonicalUrl ? { canonical_url: draft.canonicalUrl } : {}),
          ...(draft.summary ? { description: draft.summary.slice(0, 140) } : {}),
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Dev.to publish failed ${res.status}: ${err}`);
      throw new Error(`Dev.to publish failed (${res.status})`);
    }

    const data = (await res.json()) as { id: number; url: string };
    return { externalId: String(data.id), url: data.url };
  }
}
