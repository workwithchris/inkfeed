import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/public-urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/settings", "/sign-in", "/sign-up", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
