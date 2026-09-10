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

export interface ArticleResponse {
  id: string;
  youtubeUrl: string;
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
  status: string;
  durationSeconds: number | null;
  channel: string | null;
  videoId: string;
  createdAt: string;
  completedAt: string | null;
  aiModel: string | null;
  errorMessage: string | null;
}

export interface PublicArticleResponse {
  id: string;
  title: string;
  slug: string | null;
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
}

export interface ConnectionResponse {
  id: string;
  userId: string;
  platform: "devto" | "hashnode" | "blogger" | "linkedin";
  blogId: string | null;
  blogName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationResponse {
  id: string;
  articleId: string;
  connectionId: string;
  platform: "devto" | "hashnode" | "blogger" | "linkedin";
  status: string;
  externalId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export async function createArticle(
  youtubeUrl: string,
): Promise<{ id: string; status: string }> {
  return apiFetch("/api/articles", {
    method: "POST",
    body: JSON.stringify({ youtubeUrl }),
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

export async function listArticles(): Promise<ArticleResponse[]> {
  return apiFetch("/api/articles");
}

export async function deleteArticle(id: string): Promise<void> {
  await apiFetch(`/api/articles/${id}`, { method: "DELETE" });
}

export async function updateArticle(
  id: string,
  data: { title?: string; content?: string },
): Promise<ArticleResponse> {
  return apiFetch(`/api/articles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Connections ──────────────────────────────────────────
export async function listConnections(): Promise<ConnectionResponse[]> {
  return apiFetch("/api/connections");
}

export async function createConnection(data: {
  platform: "devto" | "hashnode" | "blogger" | "linkedin";
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

// ─── Publishing ───────────────────────────────────────────
export async function publishArticle(
  articleId: string,
  connectionId: string,
  includeCoverImage = true,
): Promise<{ publicationId: string; status: string }> {
  return apiFetch(`/api/articles/${articleId}/publish`, {
    method: "POST",
    body: JSON.stringify({ connectionId, includeCoverImage }),
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
