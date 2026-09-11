// Guard against SSRF when a user supplies a destination URL (webhooks,
// self-hosted blogs). Blocks loopback, link-local, and private address ranges
// by literal host.

function isPrivateIpv4(host: string): boolean {
  const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = match.slice(1).map(Number) as [number, number, number, number];
  if ([a, b].some((n) => n > 255)) return true; // malformed → reject
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "::1" ||
    h === "::" ||
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    h.startsWith("fe80") ||
    h.startsWith("::ffff:127.") ||
    h.startsWith("::ffff:10.") ||
    h.startsWith("::ffff:192.168.")
  );
}

export function assertPublicHost(hostname: string): void {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) throw new Error("URL is missing a host");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("URL cannot point to a local address");
  }

  if (host.includes(":")) {
    if (isPrivateIpv6(host)) {
      throw new Error("URL cannot point to a private address");
    }
    return;
  }

  if (isPrivateIpv4(host)) {
    throw new Error("URL cannot point to a private address");
  }

  // Single-label hostnames resolve only on internal networks.
  if (!host.includes(".")) {
    throw new Error("URL must be a public domain or IP address");
  }
}

export function normalizeHttpUrl(input: string, label = "URL"): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error(`Enter a ${label}`);

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Enter a valid ${label}, e.g. https://example.com/hook`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${label} must use http or https`);
  }

  assertPublicHost(url.hostname);

  return url.toString();
}
