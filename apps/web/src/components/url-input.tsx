"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createArticle } from "@/lib/api";

function isValidYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.test(url);
}

export function UrlInput() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createArticle,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      setUrl("");
      setError("");
      router.push(`/app/articles/${data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    if (!isValidYouTubeUrl(url)) {
      setError("Enter a valid YouTube URL");
      return;
    }
    mutation.mutate(url);
  };

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          placeholder="https://youtube.com/watch?v=..."
          className="input-default flex-1"
          disabled={mutation.isPending}
        />
        <button
          type="submit"
          disabled={mutation.isPending || !url.trim()}
          className="btn-primary shrink-0"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating…
            </span>
          ) : (
            "Convert"
          )}
        </button>
      </div>
      {error && <p className="text-body-sm text-error">{error}</p>}
    </form>
  );
}
