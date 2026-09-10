import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AuthTokenBridge } from "@/components/auth-token-bridge";

export const metadata: Metadata = {
  title: {
    default: "YouTube to Article",
    template: "%s — YouTube to Article",
  },
  description: "Transform YouTube videos into polished articles with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="flex min-h-screen flex-col">
          <AuthTokenBridge />
          <SiteNav />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </body>
      </html>
    </ClerkProvider>
  );
}
