"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  type ProviderTestResult,
} from "@/lib/api";

const PROVIDERS: { id: string; label: string; needsBaseUrl?: boolean }[] = [
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic" },
  { id: "gemini", label: "Google Gemini" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "groq", label: "Groq" },
  { id: "mistral", label: "Mistral" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "xai", label: "xAI (Grok)" },
  { id: "openai-compatible", label: "OpenAI-compatible", needsBaseUrl: true },
];

const EMPTY = {
  provider: "openai",
  model: "",
  apiKey: "",
  label: "",
  baseUrl: "",
};

export function ProviderManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [testResults, setTestResults] = useState<
    Record<string, ProviderTestResult>
  >({});

  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: listProviders,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["providers"] });

  const addMutation = useMutation({
    mutationFn: createProvider,
    onSuccess: () => {
      setForm(EMPTY);
      setOpen(false);
      setError("");
      invalidate();
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (input: {
      id: string;
      data: {
        label?: string;
        model?: string;
        enabled?: boolean;
        priority?: number;
      };
    }) => updateProvider(input.id, input.data),
    onSuccess: invalidate,
    onError: (err: Error) => setError(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: deleteProvider,
    onSuccess: invalidate,
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => testProvider(id),
    onSuccess: (data, id) =>
      setTestResults((prev) => ({ ...prev, [id]: data })),
    onError: (err: Error, id) =>
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          ok: false,
          model: "",
          latencyMs: 0,
          sample: "",
          error: err.message,
        },
      })),
  });

  const selected = PROVIDERS.find((p) => p.id === form.provider);
  const list = providers ?? [];

  const move = (index: number, dir: -1 | 1) => {
    const target = list[index + dir];
    const item = list[index];
    if (!target || !item) return;
    updateMutation.mutate({
      id: item.id,
      data: { priority: target.priority },
    });
    updateMutation.mutate({
      id: target.id,
      data: { priority: item.priority },
    });
  };

  const submit = () => {
    setError("");
    if (!form.model.trim() || !form.apiKey.trim()) {
      setError("Model and API key are required");
      return;
    }
    if (selected?.needsBaseUrl && !form.baseUrl.trim()) {
      setError("Base URL is required for this provider");
      return;
    }
    addMutation.mutate({
      provider: form.provider,
      model: form.model.trim(),
      apiKey: form.apiKey.trim(),
      label: form.label.trim() || undefined,
      baseUrl: form.baseUrl.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="rounded-md border border-error/20 bg-canvas px-4 py-3">
          <p className="text-body-md text-error">{error}</p>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">AI providers</p>
            <p className="mt-1 text-body-md text-mute">
              Bring your own keys. Tried top to bottom until one succeeds.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              setError("");
            }}
            className="btn-sm-primary shrink-0"
          >
            {open ? "Cancel" : "Add provider"}
          </button>
        </div>

        {open && (
          <div className="card flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-body-sm text-body">Provider</span>
                <select
                  value={form.provider}
                  onChange={(e) =>
                    setForm({ ...form, provider: e.target.value })
                  }
                  className="input-default"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-body-sm text-body">Model</span>
                <input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className="input-default"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-body-sm text-body">API key</span>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-…"
                  className="input-default"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-body-sm text-body">
                  Label <span className="text-faint">(optional)</span>
                </span>
                <input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Primary"
                  className="input-default"
                />
              </label>

              {selected?.needsBaseUrl && (
                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-body-sm text-body">Base URL</span>
                  <input
                    value={form.baseUrl}
                    onChange={(e) =>
                      setForm({ ...form, baseUrl: e.target.value })
                    }
                    placeholder="https://api.example.com/v1"
                    className="input-default"
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={submit}
                disabled={addMutation.isPending}
                className="btn-sm-primary"
              >
                {addMutation.isPending ? "Saving…" : "Save provider"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <span className="font-mono text-eyebrow text-faint">
          {list.length} configured
        </span>

        {isLoading ? (
          <div className="card text-body-md text-mute">Loading…</div>
        ) : !list.length ? (
          <div className="card py-10 text-center">
            <p className="text-body-md font-medium text-ink">
              No AI providers yet
            </p>
            <p className="mt-1 text-body-sm text-mute">
              Add a provider to generate articles with your own key. Falls back
              to the server default when empty.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-hairline bg-elevated">
            {list.map((p, index) => {
              const meta = PROVIDERS.find((x) => x.id === p.provider);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border-b border-hairline px-4 py-3.5 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0 || updateMutation.isPending}
                      onClick={() => move(index, -1)}
                      className="px-1 text-faint hover:text-ink disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === list.length - 1 || updateMutation.isPending}
                      onClick={() => move(index, 1)}
                      className="px-1 text-faint hover:text-ink disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-medium text-ink">
                      {p.label || meta?.label || p.provider}
                      {!p.enabled && (
                        <span className="ml-2 font-mono text-eyebrow text-faint">
                          disabled
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-body-sm text-faint">
                      {meta?.label ?? p.provider} · {p.model}
                    </p>
                    {testResults[p.id] && (
                      <p
                        className={`mt-1 text-body-sm ${
                          testResults[p.id].ok ? "text-mute" : "text-error"
                        }`}
                      >
                        {testResults[p.id].ok
                          ? `Working · ${testResults[p.id].latencyMs}ms · ${testResults[p.id].model}`
                          : `Failed · ${testResults[p.id].error}`}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => testMutation.mutate(p.id)}
                    disabled={testMutation.isPending}
                    className="btn-sm-ghost"
                  >
                    {testMutation.isPending && testMutation.variables === p.id
                      ? "Testing…"
                      : "Test"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateMutation.mutate({
                        id: p.id,
                        data: { enabled: !p.enabled },
                      })
                    }
                    className="btn-sm-ghost"
                  >
                    {p.enabled ? "Disable" : "Enable"}
                  </button>

                  <button
                    onClick={() => removeMutation.mutate(p.id)}
                    disabled={removeMutation.isPending}
                    aria-label={`Delete ${p.label ?? p.provider}`}
                    className="rounded-sm p-2 text-faint transition-colors hover:bg-hairline-soft hover:text-error disabled:opacity-40"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
