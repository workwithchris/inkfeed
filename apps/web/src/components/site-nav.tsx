"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useAuth,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/app", label: "Convert" },
  { href: "/settings", label: "Settings" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteNav() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-canvas/80 backdrop-blur-md">
      <nav className="container-page flex h-14 items-center justify-between">
        {/* Brand + links */}
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2 text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-ink text-on-ink">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </span>
            <span className="text-label-sm">Inkfeed</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => {
              const active =
                pathname === link.href ||
                pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-1.5 text-body-md transition-colors ${
                    active
                      ? "bg-hairline-soft text-ink"
                      : "text-body hover:bg-hairline-soft hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Account */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoaded &&
            (isSignedIn ? (
              <>
                <Link
                  href="/app"
                  className="btn-sm-ghost hidden sm:inline-flex"
                >
                  New article
                </Link>
                <UserButton />
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <button className="btn-sm-ghost">Log in</button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="btn-sm-primary">Sign up</button>
                </SignUpButton>
              </>
            ))}
        </div>
      </nav>
    </header>
  );
}
