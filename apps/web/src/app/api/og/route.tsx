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
          position: "relative",
          height: "100%",
          width: "100%",
          display: "flex",
          overflow: "hidden",
          background: "linear-gradient(135deg, #1c1c21 0%, #0e0e12 45%, #020203 100%)",
          color: "#f4f4f5",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Warm highlight, top-right */}
        <div
          style={{
            position: "absolute",
            top: "-25%",
            right: "-12%",
            width: "70%",
            height: "85%",
            display: "flex",
            background:
              "radial-gradient(circle at 75% 25%, rgba(244,244,245,0.16) 0%, rgba(244,244,245,0.04) 38%, rgba(244,244,245,0) 68%)",
          }}
        />
        {/* Cool glow, bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "-35%",
            left: "-12%",
            width: "68%",
            height: "90%",
            display: "flex",
            background:
              "radial-gradient(circle at 30% 75%, rgba(120,124,140,0.26) 0%, rgba(120,124,140,0.06) 42%, rgba(120,124,140,0) 70%)",
          }}
        />
        {/* Diagonal sheen */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            background:
              "linear-gradient(115deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.015) 26%, rgba(255,255,255,0) 42%)",
          }}
        />
        {/* Vignette */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            background:
              "radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)",
          }}
        />
        {/* Accent hairline */}
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            top: 168,
            height: 1,
            display: "flex",
            background:
              "linear-gradient(90deg, rgba(244,244,245,0.35) 0%, rgba(244,244,245,0.06) 55%, rgba(244,244,245,0) 100%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            width: "100%",
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
              maxWidth: "92%",
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
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
