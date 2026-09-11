import { ImageResponse } from "next/og";
import { SITE_PLATFORM_LABEL } from "@repo/types";

export const runtime = "edge";

// Deterministic social/cover image generated from an article's title + author.
// Usage: /api/og?title=…&author=…&subtitle=…
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "Untitled").slice(0, 160);
  const author = searchParams.get("author");
  const subtitle = searchParams.get("subtitle");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0c",
          color: "#f5f5f4",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#a1a1aa",
          }}
        >
          {SITE_PLATFORM_LABEL}
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 72,
            lineHeight: 1.1,
            fontWeight: 700,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 30,
            color: "#a1a1aa",
          }}
        >
          <span>{author ? `By ${author}` : ""}</span>
          <span>{subtitle ?? ""}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
