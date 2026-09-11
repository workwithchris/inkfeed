import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AuthTokenBridge } from "@/components/auth-token-bridge";

export const metadata: Metadata = {
  title: {
    default: "Inkfeed",
    template: "%s — Inkfeed",
  },
  description:
    "Turn videos, articles, feeds, and documents into polished, publishable articles with AI",
};

const themeScript = `(function(){try{var k="yta-theme";var s=localStorage.getItem(k);var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="flex min-h-screen flex-col">
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          <AuthTokenBridge />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
