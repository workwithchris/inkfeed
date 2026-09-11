"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createManualArticle } from "@/lib/api";

export function WriteFromScratch() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => createManualArticle(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      router.push(`/app/articles/${data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          setError("");
          mutation.mutate();
        }}
        disabled={mutation.isPending}
        className="btn-sm-ghost"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        {mutation.isPending ? "Starting…" : "Write from scratch"}
      </button>
      {error && <span className="text-body-sm text-error">{error}</span>}
    </div>
  );
}
