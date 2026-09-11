import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="container-page flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          <span className="text-label-sm">Inkfeed</span>
        </Link>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body-sm text-mute">
          <Link href="/explore" className="transition-colors hover:text-ink">
            Explore
          </Link>
          <Link href="/app" className="transition-colors hover:text-ink">
            Write
          </Link>
          <span>© {new Date().getFullYear()} Inkfeed</span>
        </div>
      </div>
    </footer>
  );
}
