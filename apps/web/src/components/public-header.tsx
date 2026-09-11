"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/app", label: "Write" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/80 backdrop-blur-md">
      <nav className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-ink text-on-ink">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </span>
            <span className="text-label-sm">Inkfeed</span>
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-body-md transition-colors ${
                    active
                      ? "text-ink"
                      : "text-mute hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoaded &&
            (isSignedIn ? (
              <UserButton />
            ) : (
              <Link href="/app" className="btn-sm-primary">
                Start writing
              </Link>
            ))}
        </div>
      </nav>
    </header>
  );
}
