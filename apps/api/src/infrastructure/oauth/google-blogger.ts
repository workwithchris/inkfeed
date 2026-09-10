import { createHmac, timingSafeEqual } from "crypto";

const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const BLOGGER_SCOPE = "https://www.googleapis.com/auth/blogger";
const BLOGGER_API = "https://www.googleapis.com/blogger/v3";

export interface BloggerBlog {
  id: string;
  name: string;
  url: string;
}

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set",
    );
  }
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3001/api/connections/blogger/callback";
  return { clientId, clientSecret, redirectUri };
}

// ─── OAuth state (CSRF + carries the local user id) ───────
function stateSecret(): string {
  return process.env.TOKEN_ENCRYPTION_KEY || "dev-insecure-state";
}

export function signState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: userId, t: Date.now() }),
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyState(state: string): string {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) throw new Error("Malformed OAuth state");
  const expected = createHmac("sha256", stateSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state");
  }
  const parsed = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as { u: string; t: number };
  if (Date.now() - parsed.t > 10 * 60 * 1000) {
    throw new Error("OAuth state expired");
  }
  return parsed.u;
}

// ─── Google OAuth ─────────────────────────────────────────
export function buildGoogleAuthUrl(userId: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: BLOGGER_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: signState(userId),
  });
  return `${AUTH_BASE}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string): Promise<{
  refreshToken: string;
}> {
  const { clientId, clientSecret, redirectUri } = config();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    refresh_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !json.refresh_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        "Google did not return a refresh token",
    );
  }
  return { refreshToken: json.refresh_token };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<string> {
  const { clientId, clientSecret } = config();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description || "Failed to refresh Google access token",
    );
  }
  return json.access_token;
}

export async function listBloggerBlogs(
  accessToken: string,
): Promise<BloggerBlog[]> {
  const res = await fetch(`${BLOGGER_API}/users/self/blogs`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => "")) as string;
    let detail = body;
    try {
      const parsed = JSON.parse(body) as {
        error?: { message?: string; status?: string };
      };
      detail = parsed.error?.message || parsed.error?.status || body;
    } catch {
      // keep raw body
    }
    let scopes = "";
    if (res.status === 403) {
      scopes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
      )
        .then((r) => r.json() as Promise<{ scope?: string }>)
        .then((t) => t.scope ?? "")
        .catch(() => "");
    }
    throw new Error(
      `Blogger list blogs failed (${res.status}): ${detail}` +
        (scopes ? ` | granted scopes: ${scopes}` : ""),
    );
  }
  const json = (await res.json()) as {
    items?: Array<{ id: string; name: string; url: string }>;
  };
  return (json.items ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    url: b.url,
  }));
}
