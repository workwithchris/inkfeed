import type { Metadata } from "next";
import { QueryProvider } from "@/components/query-provider";
import { ConnectionManager } from "@/components/connection-manager";
import { ProviderManager } from "@/components/provider-manager";
import { ProfileManager } from "@/components/profile-manager";

export const metadata: Metadata = {
  title: "Settings",
  description: "Connect the blog platforms you publish to.",
};

export default function SettingsPage() {
  return (
    <QueryProvider>
      <main>
        <section className="relative overflow-hidden border-b border-hairline">
          <div
            className="mesh-gradient pointer-events-none absolute right-[-20%] top-[-80%] h-[320px] w-[640px] opacity-20"
            aria-hidden
          />
          <div className="container-page relative py-16">
            <p className="eyebrow">Settings</p>
            <h1 className="mt-4 text-heading-lg text-ink">
              Publishing destinations
            </h1>
            <p className="mt-3 max-w-xl text-body-lg">
              Connect the platforms you publish to. Credentials are encrypted at
              rest and never sent to the browser.
            </p>
          </div>
        </section>

        <section className="container-page py-12">
          <div className="max-w-3xl">
            <ProfileManager />
          </div>
        </section>

        <section className="container-page border-t border-hairline py-12">
          <div className="max-w-3xl">
            <ConnectionManager />
          </div>
        </section>

        <section className="container-page border-t border-hairline py-12">
          <div className="max-w-3xl">
            <ProviderManager />
          </div>
        </section>
      </main>
    </QueryProvider>
  );
}
