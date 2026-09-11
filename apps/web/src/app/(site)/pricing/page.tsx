import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing for turning any source into a polished article.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "For trying the pipeline on a few videos.",
    features: [
      "5 articles per month",
      "Markdown export",
      "Article history",
      "Community support",
    ],
    cta: "Start free",
    href: "/app",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    cadence: "per month",
    blurb: "For writers and creators publishing every week.",
    features: [
      "100 articles per month",
      "Output templates",
      "API access & SSE streaming",
      "Priority generation queue",
    ],
    cta: "Start converting",
    href: "/app",
    featured: true,
  },
  {
    name: "Team",
    price: "$49",
    cadence: "per month",
    blurb: "For editorial teams that ship together.",
    features: [
      "Unlimited articles",
      "Unlimited seats",
      "SSO & audit log",
      "Dedicated support",
    ],
    cta: "Contact us",
    href: "/app",
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <main className="container-page py-24 sm:py-section">
      <div className="flex flex-col items-center text-center">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-6 max-w-2xl text-display-xl text-ink">
          Pay for output, not seats.
        </h1>
        <p className="mt-6 max-w-lg text-body-lg">
          Start free. Upgrade when the drafts start shipping.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`card-lg flex flex-col ${
              tier.featured ? "border-ink shadow-floating" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-heading-md text-ink">{tier.name}</p>
              {tier.featured && (
                <span className="rounded-category bg-ink px-3 py-1 font-mono text-eyebrow uppercase text-on-ink">
                  Popular
                </span>
              )}
            </div>
            <p className="mt-6 flex items-baseline gap-2">
              <span className="text-display-xl text-ink">{tier.price}</span>
              <span className="text-body-md text-mute">{tier.cadence}</span>
            </p>
            <p className="mt-3 text-body-md">{tier.blurb}</p>

            <ul className="mt-8 flex flex-1 flex-col gap-3">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-body-md">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-ink"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href={tier.href}
              className={`mt-8 ${tier.featured ? "btn-primary" : "btn-secondary"}`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-12 text-center text-body-md text-mute">
        All plans include clean Markdown export and versioned history.
      </p>
    </main>
  );
}
