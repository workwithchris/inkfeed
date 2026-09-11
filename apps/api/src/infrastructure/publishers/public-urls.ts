// Builds public URLs for the built-in site. When a username and the base app
// domain are configured, each writer gets their own subdomain, e.g.
//   username = "john", APP_DOMAIN = "inkfeed.online"
//   -> https://john.inkfeed.online/article/my-post
// Otherwise it falls back to the flat APP_URL, e.g. http://localhost:3000.

export function appBaseUrl(username?: string | null): string | null {
  const domain = (process.env.APP_DOMAIN || "").replace(/^\.+|\.+$/g, "");
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");

  if (username && domain) {
    let protocol = "https";
    try {
      if (appUrl) protocol = new URL(appUrl).protocol.replace(":", "");
    } catch {
      /* keep https */
    }
    return `${protocol}://${username}.${domain}`;
  }

  return appUrl || null;
}

export function articleUrl(
  username: string | null | undefined,
  slugOrId: string,
): string | null {
  const base = appBaseUrl(username);
  return base ? `${base}/article/${slugOrId}` : null;
}

// Canonical URLs must be publicly reachable; providers like Dev.to reject
// localhost. Returns null when the resolved base points at a local host.
export function publicCanonicalUrl(
  username: string | null | undefined,
  slugOrId: string,
): string | null {
  const url = articleUrl(username, slugOrId);
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local")
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
