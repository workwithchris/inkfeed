import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import type {
  BlogPublisher,
  PublishDraft,
  PublishResult,
  PublishPlatform,
} from "../../domain/index.js";
import { normalizeHttpUrl } from "../http/safe-url.js";
import { PublishResponseError } from "./publish-response.js";

interface WebhookCredential {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
}

// Credential is JSON: { url, secret?, headers? } so users can add auth headers
// and an optional HMAC signing secret.
function parseCredential(credential: string): WebhookCredential {
  let parsed: unknown;
  try {
    parsed = JSON.parse(credential);
  } catch {
    throw new Error("Webhook credential must include a URL");
  }

  const { url, secret, headers } = (parsed ?? {}) as Partial<WebhookCredential>;
  if (!url?.trim()) {
    throw new Error("Webhook credential requires a URL");
  }

  const clean: WebhookCredential = {
    url: normalizeHttpUrl(url, "webhook URL"),
  };

  if (secret?.trim()) clean.secret = secret.trim();

  if (headers && typeof headers === "object" && !Array.isArray(headers)) {
    const entries = Object.entries(headers).filter(
      ([key, value]) => key && typeof value === "string",
    );
    if (entries.length > 0) {
      clean.headers = Object.fromEntries(entries) as Record<string, string>;
    }
  }

  return clean;
}

@Injectable()
export class WebhookPublisher implements BlogPublisher {
  readonly platform: PublishPlatform = "webhook";
  private readonly logger = new Logger(WebhookPublisher.name);

  async validate(credential: string): Promise<{
    blogId: string | null;
    blogName: string | null;
  }> {
    const { url } = parseCredential(credential);
    return { blogId: url, blogName: new URL(url).host };
  }

  async publish(
    credential: string,
    _blogId: string | null,
    draft: PublishDraft,
  ): Promise<PublishResult> {
    const { url, secret, headers } = parseCredential(credential);

    const body = JSON.stringify({
      event: "article.published",
      sentAt: new Date().toISOString(),
      article: {
        id: draft.articleId,
        title: draft.title,
        slug: draft.slug,
        content: draft.content,
        summary: draft.summary,
        tags: draft.tags,
        canonicalUrl: draft.canonicalUrl,
        coverImageUrl: draft.coverImageUrl,
      },
    });

    const signature = secret
      ? `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`
      : null;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "inkfeed/1.0",
        ...(signature ? { "X-Webhook-Signature": signature } : {}),
        ...(headers ?? {}),
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    const text = (await res.text().catch(() => "")).slice(0, 4000);

    if (!res.ok) {
      this.logger.error(`Webhook ${url} responded ${res.status}`);
      throw new PublishResponseError(
        `Webhook responded ${res.status}`,
        res.status,
        text,
      );
    }

    // Read an id/url from a JSON response if present.
    let externalId = draft.articleId;
    let externalUrl = draft.canonicalUrl ?? url;
    try {
      const json = JSON.parse(text) as {
        id?: unknown;
        _id?: unknown;
        url?: unknown;
      };
      if (typeof json.id === "string" || typeof json.id === "number") {
        externalId = String(json.id);
      } else if (typeof json._id === "string") {
        externalId = json._id;
      } else if (typeof json.url === "string") {
        externalId = json.url;
      }
      if (typeof json.url === "string") externalUrl = json.url;
    } catch {
      // Non-JSON response — keep defaults.
    }

    return {
      externalId,
      url: externalUrl,
      responseStatus: res.status,
      responseBody: text,
    };
  }
}
