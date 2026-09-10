const CANDIDATES = ["maxresdefault", "sddefault", "hqdefault"] as const;

// Resolve the best available YouTube thumbnail for a video. Returns null when
// the video has no reachable thumbnail (e.g. it was deleted).
export async function resolveYouTubeCover(
  videoId: string,
): Promise<string | null> {
  if (!videoId) return null;
  for (const name of CANDIDATES) {
    const url = `https://i.ytimg.com/vi/${videoId}/${name}.jpg`;
    const res = await fetch(url, { method: "HEAD" }).catch(() => null);
    if (res?.ok) return url;
  }
  return null;
}
