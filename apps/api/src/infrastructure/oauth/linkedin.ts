// LinkedIn Posts API ("Share on LinkedIn" product, scope w_member_social).
// Note: standard apps get a 60-day access token and NO refresh token, so the
// stored credential must be re-authorized periodically.

const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const POSTS_URL = "https://api.linkedin.com/rest/posts";
const IMAGES_URL = "https://api.linkedin.com/rest/images";

const SCOPE = "openid profile w_member_social";

function config() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET are not set");
  }
  const redirectUri =
    process.env.LINKEDIN_REDIRECT_URI ||
    "http://localhost:3001/api/connections/linkedin/callback";
  return { clientId, clientSecret, redirectUri };
}

export function linkedinVersion(): string {
  return process.env.LINKEDIN_VERSION || "202601";
}

function restHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Linkedin-Version": linkedinVersion(),
    "X-Restli-Protocol-Version": "2.0.0",
    "Content-Type": "application/json",
  };
}

// ─── OAuth ────────────────────────────────────────────────
export function buildLinkedInAuthUrl(state: string): string {
  const { clientId, redirectUri } = config();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string): Promise<string> {
  const { clientId, clientSecret, redirectUri } = config();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        "LinkedIn did not return an access token",
    );
  }
  return json.access_token;
}

export async function getLinkedInMember(accessToken: string): Promise<{
  sub: string;
  name: string | null;
}> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    sub?: string;
    name?: string;
    message?: string;
  };
  if (!res.ok || !json.sub) {
    throw new Error(
      res.status === 401
        ? "LinkedIn token is expired or invalid. Reconnect LinkedIn."
        : json.message || `LinkedIn userinfo failed (${res.status})`,
    );
  }
  return { sub: json.sub, name: json.name ?? null };
}

// ─── Images ───────────────────────────────────────────────
// Uploads an image from a public URL and returns its `urn:li:image:...`.
export async function uploadLinkedInImage(
  accessToken: string,
  ownerUrn: string,
  imageUrl: string,
): Promise<string | null> {
  const init = await fetch(`${IMAGES_URL}?action=initializeUpload`, {
    method: "POST",
    headers: restHeaders(accessToken),
    body: JSON.stringify({ initializeUploadRequest: { owner: ownerUrn } }),
  });
  const initJson = (await init.json().catch(() => ({}))) as {
    value?: { uploadUrl?: string; image?: string };
  };
  const uploadUrl = initJson.value?.uploadUrl;
  const imageUrn = initJson.value?.image;
  if (!init.ok || !uploadUrl || !imageUrn) return null;

  const bytes = await fetch(imageUrl).then((r) =>
    r.ok ? r.arrayBuffer() : null,
  );
  if (!bytes) return null;

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "image/jpeg" },
    body: bytes,
  });
  return put.ok ? imageUrn : null;
}

// ─── Posts ────────────────────────────────────────────────
export async function createLinkedInArticlePost(
  accessToken: string,
  authorUrn: string,
  fields: {
    source: string;
    title: string;
    description: string;
    thumbnailUrn: string | null;
    commentary: string;
  },
): Promise<{ id: string; url: string }> {
  const res = await fetch(POSTS_URL, {
    method: "POST",
    headers: restHeaders(accessToken),
    body: JSON.stringify({
      author: authorUrn,
      commentary: fields.commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        article: {
          source: fields.source,
          title: fields.title,
          description: fields.description,
          ...(fields.thumbnailUrn ? { thumbnail: fields.thumbnailUrn } : {}),
        },
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error(
        "LinkedIn token is expired. Reconnect LinkedIn in settings.",
      );
    }
    throw new Error(`LinkedIn post failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const id = res.headers.get("x-restli-id") ?? "";
  return { id, url: postUrl(id) };
}

function postUrl(urn: string): string {
  return urn ? `https://www.linkedin.com/feed/update/${urn}/` : "";
}
