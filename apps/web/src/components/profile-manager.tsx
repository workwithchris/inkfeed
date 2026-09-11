"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateMyUsername } from "@/lib/api";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "";

export function ProfileManager() {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getMyProfile,
  });

  useEffect(() => {
    if (data?.username) setUsername(data.username);
  }, [data?.username]);

  const mutation = useMutation({
    mutationFn: updateMyUsername,
    onSuccess: (res) => {
      setUsername(res.username);
      setError("");
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => {
      setSaved(false);
      setError(err.message);
    },
  });

  const normalized = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const preview = normalized
    ? APP_DOMAIN
      ? `${normalized}.${APP_DOMAIN}`
      : `/${normalized}`
    : null;

  const dirty = !!data && normalized !== (data.username ?? "");
  const valid = /^[a-z0-9][a-z0-9-]{2,31}$/.test(normalized);

  const submit = () => {
    setSaved(false);
    setError("");
    if (!valid) {
      setError("Username must be 3-32 characters: letters, numbers, hyphens.");
      return;
    }
    mutation.mutate(normalized);
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="eyebrow">Public profile</p>
        <p className="mt-1 text-body-md text-mute">
          Your username becomes your public profile address. Published articles
          appear there.
        </p>
      </div>

      <div className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-body-sm text-mute">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
              setSaved(false);
            }}
            placeholder={isLoading ? "Loading…" : "your-handle"}
            disabled={isLoading || mutation.isPending}
            className="input-default"
          />
        </label>

        {preview && (
          <p className="text-body-sm text-faint">
            Your profile:{" "}
            <span className="font-mono text-body">{preview}</span>
          </p>
        )}

        {error && <p className="text-body-sm text-error">{error}</p>}
        {saved && !error && (
          <p className="text-body-sm text-mute">Username updated.</p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={!dirty || !valid || mutation.isPending}
            className="btn-sm-primary"
          >
            {mutation.isPending ? "Saving…" : "Save username"}
          </button>
        </div>
      </div>
    </section>
  );
}