import Link from "next/link";

const groups = [
  {
    title: "Product",
    links: [
      { label: "Convert", href: "/app" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "API", href: "/app" },
      { label: "Changelog", href: "/" },
      { label: "Docs", href: "/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/" },
      { label: "Contact", href: "/" },
      { label: "Privacy", href: "/" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="container-page py-16">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-ink">
              <svg width="16" height="16" viewBox="0 0 76 65" fill="currentColor" aria-hidden>
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
              <span className="text-label-sm">YouTube to Article</span>
            </Link>
            <p className="mt-3 text-body-sm text-mute">
              Transform YouTube videos into polished articles with AI.
            </p>
          </div>

          {groups.map((group) => (
            <div key={group.title}>
              <p className="eyebrow">{group.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body-md text-body transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-hairline pt-6 text-body-sm text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} YouTube to Article. All rights reserved.</p>
          <p className="font-mono">Built for writers, not transcribers.</p>
        </div>
      </div>
    </footer>
  );
}
