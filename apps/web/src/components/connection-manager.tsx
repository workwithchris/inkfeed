"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listConnections,
  createConnection,
  deleteConnection,
  getBloggerAuthUrl,
  getLinkedInAuthUrl,
  type ConnectionResponse,
} from "@/lib/api";
import { PlatformIcon } from "./platform-icon";

type PlatformId = ConnectionResponse["platform"];

const PLATFORMS: {
  id: PlatformId;
  label: string;
  description: string;
  auth: "token" | "oauth";
}[] = [
  {
    id: "devto",
    label: "Dev.to",
    description: "Developer blogging community.",
    auth: "token",
  },
  {
    id: "github",
    label: "GitHub",
    description: "Commit Markdown posts to a repository.",
    auth: "token",
  },
  {
    id: "blogger",
    label: "Blogger",
    description: "Google's publishing platform.",
    auth: "oauth",
  },
  {
    id: "webhook",
    label: "Webhook",
    description: "POST articles as JSON to your own endpoint.",
    auth: "token",
  },
];

// LinkedIn temporarily disabled until app credentials are configured.
const DISABLED_PLATFORMS: PlatformId[] = ["linkedin"];

const HINTS: Partial<Record<PlatformId, string>> = {
  devto: "Create an API key at dev.to/settings/extensions and paste it here.",
  github:
    "Create a PAT with Contents + Administration: Read and write at github.com/settings/tokens. Posts commit to your OWNER/articles repo.",
  webhook:
    "We POST the article as JSON. Add a signing secret to verify the X-Webhook-Signature header.",
};

// Built-in destinations that don't appear in the connect grid.
const CONNECTION_LABELS: Partial<Record<PlatformId, string>> = {
  site: "InkFeed",
};

export function ConnectionManager() {
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState<PlatformId | null>(null);
  const [credential, setCredential] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [connectingBlogger, setConnectingBlogger] = useState(false);
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);

  // Surface the result of the OAuth redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected === "blogger" || connected === "linkedin") {
      setNotice(`${connected === "blogger" ? "Blogger" : "LinkedIn"} connected.`);
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      window.history.replaceState({}, "", "/settings");
    } else if (params.get("error")) {
      setError(params.get("error") ?? "");
      window.history.replaceState({}, "", "/settings");
    }
  }, [queryClient]);

  const { data: connections, isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: listConnections,
  });

  const visibleConnections = connections?.filter(
    (c) => !DISABLED_PLATFORMS.includes(c.platform),
  );

  const addMutation = useMutation({
    mutationFn: createConnection,
    onSuccess: () => {
      setCredential("");
      setWebhookUrl("");
      setOpenForm(null);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: deleteConnection,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["connections"] }),
  });

  const connectBlogger = async () => {
    setError("");
    setConnectingBlogger(true);
    try {
      const { url } = await getBloggerAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start OAuth");
      setConnectingBlogger(false);
    }
  };

  const connectLinkedIn = async () => {
    setError("");
    setConnectingLinkedIn(true);
    try {
      const { url } = await getLinkedInAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start OAuth");
      setConnectingLinkedIn(false);
    }
  };

  const connectedCount = (platform: PlatformId) =>
    connections?.filter((c) => c.platform === platform).length ?? 0;

  const submitToken = (platform: PlatformId) => {
    setError("");
    if (platform === "webhook") {
      if (!webhookUrl.trim()) {
        setError("Enter a webhook URL");
        return;
      }
      addMutation.mutate({
        platform,
        credential: JSON.stringify({
          url: webhookUrl.trim(),
          ...(credential.trim() ? { secret: credential.trim() } : {}),
        }),
      });
      return;
    }
    if (!credential.trim()) {
      setError("Paste a token to continue");
      return;
    }
    addMutation.mutate({ platform, credential: credential.trim() });
  };

  return (
    <div className="flex flex-col gap-10">
      {notice && (
        <div className="flex items-center gap-3 rounded-md border border-hairline bg-hairline-soft px-4 py-3">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12l5 5L20 7" />
          </svg>
          <p className="text-body-md text-ink">{notice}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-md border border-error/20 bg-canvas px-4 py-3">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-error" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <p className="text-body-md text-error">{error}</p>
        </div>
      )}

      {/* ─── Platforms ──────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Platforms</p>
            <p className="mt-1 text-body-md text-mute">
              Authorize a destination once, then publish drafts anytime.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLATFORMS.map((platform) => {
            const count = connectedCount(platform.id);
            const isOpen = openForm === platform.id;
            const isOauth = platform.auth === "oauth";
            const redirecting =
              isOauth &&
              (platform.id === "linkedin"
                ? connectingLinkedIn
                : connectingBlogger);
            const connected = count > 0;

            return (
              <div
                key={platform.id}
                className={`flex flex-col rounded-lg border bg-elevated p-5 transition-colors ${
                  isOpen ? "border-ink" : "border-hairline hover:border-ink/30"
                }`}
              >
                {/* Header */}
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-hairline bg-canvas text-ink">
                    <PlatformIcon platform={platform.id} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-heading-md text-ink">
                      {platform.label}
                    </h3>
                    <p className="mt-1 text-body-sm text-mute">
                      {platform.description}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${
                      connected ? "text-body" : "text-faint"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        connected ? "bg-ink" : "bg-faint"
                      }`}
                    />
                    {connected
                      ? count > 1
                        ? `${count} connected`
                        : "Connected"
                      : "Not connected"}
                  </span>
                </div>

                {/* Action / form */}
                <div className="mt-auto pt-5">
                  {isOauth ? (
                    <button
                      type="button"
                      onClick={
                        platform.id === "linkedin"
                          ? connectLinkedIn
                          : connectBlogger
                      }
                      disabled={redirecting}
                      className="btn-sm-primary w-full"
                    >
                      {redirecting
                        ? "Redirecting…"
                        : connected
                          ? "Reconnect"
                          : "Connect"}
                    </button>
                  ) : isOpen ? (
                    <div className="flex flex-col gap-3">
                      {platform.id === "webhook" && (
                        <input
                          type="url"
                          autoFocus
                          value={webhookUrl}
                          onChange={(e) => {
                            setWebhookUrl(e.target.value);
                            setError("");
                          }}
                          placeholder="https://example.com/hooks/articles"
                          className="input-default"
                          disabled={addMutation.isPending}
                        />
                      )}
                      <input
                        type="password"
                        autoFocus={platform.id !== "webhook"}
                        value={credential}
                        onChange={(e) => {
                          setCredential(e.target.value);
                          setError("");
                        }}
                        placeholder={
                          platform.id === "webhook"
                            ? "Signing secret (optional)"
                            : "Paste API key"
                        }
                        className="input-default"
                        disabled={addMutation.isPending}
                      />
                      {HINTS[platform.id] && (
                        <p className="rounded-sm bg-canvas px-3 py-2 text-body-sm text-faint">
                          {HINTS[platform.id]}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenForm(null);
                            setCredential("");
                            setWebhookUrl("");
                            setError("");
                          }}
                          className="btn-sm-ghost flex-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => submitToken(platform.id)}
                          disabled={addMutation.isPending}
                          className="btn-sm-primary flex-1"
                        >
                          {addMutation.isPending ? "Validating…" : "Connect"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setOpenForm(platform.id);
                        setError("");
                      }}
                      className={
                        connected
                          ? "btn-sm-ghost w-full"
                          : "btn-sm-primary w-full"
                      }
                    >
                      {connected ? "Add another account" : "Connect"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Connected accounts ─────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <p className="eyebrow">Connected accounts</p>
          <span className="font-mono text-eyebrow text-faint">
            {visibleConnections?.length ?? 0} connected
          </span>
        </div>

        {isLoading ? (
          <div className="card text-body-md text-mute">Loading…</div>
        ) : !visibleConnections?.length ? (
          <div className="card flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-canvas text-faint">
              <PlatformIcon platform="devto" className="h-5 w-5 opacity-40" />
            </span>
            <p className="mt-2 text-body-md font-medium text-ink">
              No accounts connected
            </p>
            <p className="text-body-sm text-mute">
              Connect a platform above to start publishing.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-hairline bg-elevated">
            {visibleConnections.map((conn) => {
              const meta = PLATFORMS.find((p) => p.id === conn.platform);
              return (
                <div
                  key={conn.id}
                  className="flex items-center gap-4 border-b border-hairline px-4 py-3.5 last:border-b-0"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-ink">
                    <PlatformIcon platform={conn.platform} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-medium text-ink">
                      {meta?.label ?? CONNECTION_LABELS[conn.platform] ?? conn.platform}
                    </p>
                    <p className="mt-0.5 truncate text-body-sm text-faint">
                      {conn.platform === "site"
                        ? "Built-in public article page"
                        : conn.blogName || "Connected"}
                    </p>
                  </div>
                  {conn.platform !== "site" && (
                    <button
                      onClick={() => removeMutation.mutate(conn.id)}
                      disabled={removeMutation.isPending}
                      aria-label={`Disconnect ${meta?.label ?? conn.platform}`}
                      className="rounded-sm p-2 text-faint transition-colors hover:bg-hairline-soft hover:text-error disabled:opacity-40"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
