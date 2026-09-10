// Build an X/Twitter web-intent URL. No API key or auth required — this just
// opens the compose window with text pre-filled.
export function tweetIntentUrl(text: string, url?: string): string {
  const params = new URLSearchParams();
  if (text) params.set("text", text);
  if (url) params.set("url", url);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

const MAX_TWEET = 280;

function clamp(text: string): string {
  return text.length > MAX_TWEET
    ? `${text.slice(0, MAX_TWEET - 3).trimEnd()}...`
    : text;
}

// Extract the opening tweet from a generated thread. Splits on numbering
// markers like "1/", "2.", "3)" at the start of a line so multi-line tweets
// survive, then strips the leading marker and clamps to 280 characters.
export function firstTweet(threadContent: string): string {
  const parts = threadContent
    .split(/\n(?=\s*\d+\s*[/.)]\s)/)
    .map((part) => part.trim().replace(/^\s*\d+\s*[/.)]\s*/, ""))
    .filter(Boolean);

  const first = parts[0] ?? threadContent.trim();
  return clamp(first);
}
