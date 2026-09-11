import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)", "/settings(.*)"]);

// The base domain that hosts the public hub and user profiles as subdomains,
// e.g. "inkfeed.online". A request to "read.inkfeed.online" renders the global
// feed, and "john.inkfeed.online" renders that user's profile.
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "";
const FEED_SUBDOMAIN = "read";

export default clerkMiddleware(async (auth, req) => {
  const host = req.nextUrl.hostname;

  // A request to the root of a public subdomain renders the feed or a profile.
  // Other paths (e.g. /article/:slug) already resolve on their own, so we
  // leave them untouched to keep global nav links working.
  if (APP_DOMAIN && req.nextUrl.pathname === "/") {
    const subdomain = host.endsWith(`.${APP_DOMAIN}`)
      ? host.slice(0, host.length - APP_DOMAIN.length - 1)
      : null;

    if (subdomain === FEED_SUBDOMAIN) {
      const url = req.nextUrl.clone();
      url.pathname = "/explore";
      return NextResponse.rewrite(url);
    }

    if (subdomain && subdomain !== "www") {
      const url = req.nextUrl.clone();
      url.pathname = `/u/${subdomain}`;
      return NextResponse.rewrite(url);
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return;
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};