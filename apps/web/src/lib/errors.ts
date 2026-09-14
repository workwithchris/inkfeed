// Map raw generation errors to a helpful, human hint.
export function describeGenerationError(
  message: string | null | undefined,
): string | null {
  if (!message) return null;
  const m = message.toLowerCase();

  if (
    m.includes("timed out") ||
    m.includes("timeout") ||
    m.includes("all routes failed")
  ) {
    return "The AI model took too long to respond. Try again, or add another provider in Settings → AI providers so a fallback can answer.";
  }
  if (m.includes("empty response")) {
    return "The model returned an empty response. Try again, or switch the model in Settings → AI providers.";
  }
  if (m.includes("rate limit") || m.includes("429")) {
    return "The AI provider is rate-limiting requests. Wait a moment and try again, or add another provider.";
  }
  return null;
}
