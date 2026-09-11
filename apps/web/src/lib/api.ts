const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Clerk token getter, registered by <AuthTokenBridge />.
type TokenGetter = () => Promise<string | null>;
let tokenGetter: TokenGetter | null = null;

export function setTokenGetter(fn: TokenGetter | null) {
  tokenGetter = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!tokenGetter) return {};
  const token = await tokenGetter().catch(() => null);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(await authHeaders()),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export type SourceType = "youtube" | "url" | "document" | "feed" | "manual";

export interface ArticleResponse {
  id: string;
  youtubeUrl: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceItemUrl: string | null;
  title: string;
  content: string;
  summary: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  keywords: string[] | null;
  tags: string[] | null;
  readingTimeMinutes: number | null;
  coverImageUrl: string | null;
  viewCount: number;
  status: string;
  durationSeconds: number | null;
  channel: string | null;
  videoId: string;
  createdAt: string;
  completedAt: string | null;
  aiModel: string | null;
  aiSource: "user" | "platform" | null;
  errorMessage: string | null;
}

export interface PublicArticleResponse {
  id: string;
  title: string;
  slug: string | null;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceItemUrl: string | null;
  content: string;
  summary: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[] | null;
  tags: string[] | null;
  coverImageUrl: string | null;
  channel: string | null;
  readingTimeMinutes: number | null;
  youtubeUrl: string;
  createdAt: string;
  authorUsername: string | null;
  authorName: string | null;
}

export type PublishPlatformId =
  | "devto"
  | "hashnode"
  | "blogger"
  | "linkedin"
  | "github"
  | "site"
  | "webhook";

export interface ConnectionResponse {
  id: string;
  userId: string;
  platform: PublishPlatformId;
  blogId: string | null;
  blogName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationResponse {
  id: string;
  articleId: string;
  connectionId: string;
  platform: PublishPlatformId;
  status: string;
  externalId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: string;
}

export interface CreateArticleSource {
  sourceType: "youtube" | "url" | "feed";
  url: string;
  itemUrl?: string;
}

export async function createArticle(
  source: CreateArticleSource,
): Promise<{ id: string; status: string }> {
  return apiFetch("/api/articles", {
    method: "POST",
    body: JSON.stringify(source),
  });
}

export async function createManualArticle(
  title?: string,
): Promise<{ id: string; status: string }> {
  return apiFetch("/api/articles/manual", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export async function uploadArticle(
  filename: string,
  contentBase64: string,
): Promise<{ id: string; status: string }> {
  return apiFetch("/api/articles/upload", {
    method: "POST",
    body: JSON.stringify({ filename, contentBase64 }),
  });
}

export interface FeedItem {
  title: string;
  link: string | null;
  audioUrl: string | null;
  publishedAt: string | null;
  summary: string | null;
}

export async function inspectFeed(
  url: string,
): Promise<{ title: string; items: FeedItem[] }> {
  return apiFetch("/api/feeds/inspect", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function getArticle(id: string): Promise<ArticleResponse> {
  return apiFetch(`/api/articles/${id}`);
}

export async function getPublicArticle(
  slugOrId: string,
): Promise<PublicArticleResponse | null> {
  const res = await fetch(
    `${API_BASE}/api/public/articles/${encodeURIComponent(slugOrId)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return res.json() as Promise<PublicArticleResponse>;
}

// ─── Public profiles (username subdomains) ─────────────────
export interface PublicProfileArticle {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  coverImageUrl: string | null;
  tags: string[] | null;
  readingTimeMinutes: number | null;
  channel: string | null;
  createdAt: string;
}

export interface PublicProfile {
  user: {
    id: string;
    username: string | null;
    name: string | null;
    bio: string | null;
  };
  articles: PublicProfileArticle[];
}

export async function getPublicProfile(
  username: string,
): Promise<PublicProfile | null> {
  const res = await fetch(
    `${API_BASE}/api/public/profiles/${encodeURIComponent(username)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return res.json() as Promise<PublicProfile>;
}

// ─── Public feed (read.inkfeed.online) ─────────────────────
export interface PublicFeedItem {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  coverImageUrl: string | null;
  tags: string[] | null;
  readingTimeMinutes: number | null;
  channel: string | null;
  sourceType: SourceType;
  createdAt: string;
  authorUsername: string | null;
  authorName: string | null;
}

export interface PublicFeed {
  total: number;
  limit: number;
  offset: number;
  items: PublicFeedItem[];
}

export async function getPublicFeed(
  params: { limit?: number; offset?: number; tag?: string } = {},
): Promise<PublicFeed> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.tag) qs.set("tag", params.tag);

  const res = await fetch(`${API_BASE}/api/public/feed?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    return { total: 0, limit: params.limit ?? 12, offset: params.offset ?? 0, items: [] };
  }
  return res.json() as Promise<PublicFeed>;
}

export async function getMyProfile(): Promise<{ username: string | null; name: string | null }> {
  return apiFetch("/api/profile");
}

export async function updateMyUsername(
  username: string,
): Promise<{ username: string }> {
  return apiFetch("/api/profile", {
    method: "PATCH",
    body: JSON.stringify({ username }),
  });
}

export async function listArticles(): Promise<ArticleResponse[]> {
  return apiFetch("/api/articles");
}

export async function deleteArticle(id: string): Promise<void> {
  await apiFetch(`/api/articles/${id}`, { method: "DELETE" });
}

export interface UpdateArticleInput {
  title?: string;
  content?: string;
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  keywords?: string[];
  tags?: string[];
  coverImageUrl?: string;
}

export async function updateArticle(
  id: string,
  data: UpdateArticleInput,
): Promise<ArticleResponse> {
  return apiFetch(`/api/articles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function regenerateArticle(
  id: string,
): Promise<{ id: string; status: string }> {
  return apiFetch(`/api/articles/${id}/regenerate`, { method: "POST" });
}

// ─── Connections ──────────────────────────────────────────
export async function listConnections(): Promise<ConnectionResponse[]> {
  return apiFetch("/api/connections");
}

export async function createConnection(data: {
  platform: PublishPlatformId;
  credential: string;
  blogId?: string;
}): Promise<ConnectionResponse> {
  return apiFetch("/api/connections", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteConnection(id: string): Promise<void> {
  await apiFetch(`/api/connections/${id}`, { method: "DELETE" });
}

export async function getBloggerAuthUrl(): Promise<{ url: string }> {
  return apiFetch("/api/connections/blogger/authorize");
}

export async function getLinkedInAuthUrl(): Promise<{ url: string }> {
  return apiFetch("/api/connections/linkedin/authorize");
}

// ─── AI Providers (BYOK) ──────────────────────────────────
export interface AiProviderResponse {
  id: string;
  userId: string;
  provider: string;
  model: string;
  label: string | null;
  baseUrl: string | null;
  enabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export async function listProviders(): Promise<AiProviderResponse[]> {
  return apiFetch("/api/providers");
}

export async function createProvider(data: {
  provider: string;
  model: string;
  apiKey: string;
  label?: string;
  baseUrl?: string;
}): Promise<AiProviderResponse> {
  return apiFetch("/api/providers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProvider(
  id: string,
  data: { label?: string; model?: string; enabled?: boolean; priority?: number },
): Promise<AiProviderResponse> {
  return apiFetch(`/api/providers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProvider(id: string): Promise<void> {
  await apiFetch(`/api/providers/${id}`, { method: "DELETE" });
}

export interface ProviderTestResult {
  ok: boolean;
  model: string;
  latencyMs: number;
  sample: string;
  error?: string;
}

export async function testProvider(id: string): Promise<ProviderTestResult> {
  return apiFetch(`/api/providers/${id}/test`, { method: "POST" });
}

// ─── Publishing ───────────────────────────────────────────
export interface PublishOptions {
  includeCoverImage?: boolean;
  title?: string;
  coverImageUrl?: string;
}

export async function publishArticle(
  articleId: string,
  connectionId: string,
  options: PublishOptions = {},
): Promise<{ publicationId: string; status: string }> {
  return apiFetch(`/api/articles/${articleId}/publish`, {
    method: "POST",
    body: JSON.stringify({ connectionId, ...options }),
  });
}

export async function listPublications(
  articleId: string,
): Promise<PublicationResponse[]> {
  return apiFetch(`/api/articles/${articleId}/publications`);
}

export async function listAllPublications(): Promise<PublicationResponse[]> {
  return apiFetch("/api/publications");
}

export async function unpublishArticleSite(articleId: string): Promise<void> {
  await apiFetch(`/api/articles/${articleId}/site`, { method: "DELETE" });
}

// ─── Repurposing (derivatives) ────────────────────────────
export type DerivativeKind = "tweet_thread" | "newsletter" | "video_script";

export interface DerivativeResponse {
  id: string;
  articleId: string;
  kind: DerivativeKind;
  status: "PENDING" | "SYNTHESIZING" | "COMPLETED" | "FAILED";
  content: string | null;
  aiModel: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function listDerivatives(
  articleId: string,
): Promise<DerivativeResponse[]> {
  return apiFetch(`/api/articles/${articleId}/derivatives`);
}

export async function createDerivative(
  articleId: string,
  kind: DerivativeKind,
): Promise<{ id: string; status: string }> {
  return apiFetch(`/api/articles/${articleId}/derivatives`, {
    method: "POST",
    body: JSON.stringify({ kind }),
  });
}

export async function updateDerivative(
  articleId: string,
  derivativeId: string,
  content: string,
): Promise<{ id: string; status: string }> {
  return apiFetch(`/api/articles/${articleId}/derivatives/${derivativeId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export async function deleteDerivative(
  articleId: string,
  derivativeId: string,
): Promise<void> {
  await apiFetch(`/api/articles/${articleId}/derivatives/${derivativeId}`, {
    method: "DELETE",
  });
}

export function createSseConnection(
  articleId: string,
  token: string | null,
  onEvent: (event: unknown) => void,
): () => void {
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  const eventSource = new EventSource(
    `${API_BASE}/api/articles/${articleId}/events${qs}`,
  );

  eventSource.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      // ignore parse errors
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => eventSource.close();
}
