const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const APP_DOMAIN = (process.env.NEXT_PUBLIC_APP_DOMAIN || "").replace(
  /^\.+|\.+$/g,
  "",
);

export const SITE_URL = SITE || "http://localhost:3000";
export const PUBLIC_APP_DOMAIN = APP_DOMAIN;

function baseProtocol(): string {
  try {
    return new URL(SITE).protocol.replace(":", "");
  } catch {
    return "https";
  }
}

export function profileUrl(username: string): string {
  if (APP_DOMAIN) {
    return `${baseProtocol()}://${username}.${APP_DOMAIN}/`;
  }
  return `${SITE_URL}/u/${username}`;
}

export function articleUrl(username: string | null, slugOrId: string): string {
  if (username && APP_DOMAIN) {
    return `${baseProtocol()}://${username}.${APP_DOMAIN}/article/${slugOrId}`;
  }
  return `${SITE_URL}/article/${slugOrId}`;
}
