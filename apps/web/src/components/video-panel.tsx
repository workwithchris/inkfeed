"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiUrl,
  deleteArticleVideo,
  generateArticleVideo,
  previewVideoScript,
  type ArticleResponse,
  type VideoOptionsInput,
  type VideoScene,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { describeGenerationError } from "@/lib/errors";

const VOICES = [
  { id: "en-US-GuyNeural", label: "Guy — US male" },
  { id: "en-US-AriaNeural", label: "Aria — US female" },
  { id: "en-US-JennyNeural", label: "Jenny — US female" },
  { id: "en-GB-RyanNeural", label: "Ryan — UK male" },
  { id: "en-GB-SoniaNeural", label: "Sonia — UK female" },
  { id: "en-AU-NatashaNeural", label: "Natasha — AU female" },
  { id: "en-IN-NeerjaNeural", label: "Neerja — IN female" },
  { id: "en-IN-PrabhatNeural", label: "Prabhat — IN male" },
];

const THEMES = [
  { id: "ink", label: "Ink" },
  { id: "slate", label: "Slate" },
  { id: "noir", label: "Noir" },
  { id: "light", label: "Light" },
] as const;

const ASPECTS = [
  { id: "9:16", label: "9:16" },
  { id: "1:1", label: "1:1" },
  { id: "16:9", label: "16:9" },
] as const;

type Background = "gradient" | "cover" | "custom";
type ScriptSource = "auto" | "rewrite" | "custom";
type ModalTab = "content" | "style";

function serializeScenes(list: VideoScene[]): string {
  return list
    .map((scene) => `${scene.text}\n${scene.narration}`.trim())
    .join("\n\n");
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-hairline bg-canvas p-1">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex-1 rounded-sm px-3 py-1.5 text-button-md transition-colors ${
              active ? "bg-ink text-white" : "text-body hover:bg-elevated"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}

export function VideoPanel({ article }: { article: ArticleResponse }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ModalTab>("content");

  const [voice, setVoice] = useState(VOICES[0].id);
  const [voiceRate, setVoiceRate] = useState(0);
  const [voicePitch, setVoicePitch] = useState(0);
  const [format, setFormat] = useState<"short" | "full">("short");
  const [aspect, setAspect] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [sceneCount, setSceneCount] = useState(6);
  const [storyboard, setStoryboard] = useState<VideoScene[]>([]);
  const [theme, setTheme] = useState<"ink" | "slate" | "noir" | "light">("ink");
  const [quality, setQuality] = useState<"preview" | "final">("final");
  const [background, setBackground] = useState<Background>("gradient");
  const [imageText, setImageText] = useState("");
  const [scriptSource, setScriptSource] = useState<ScriptSource>("auto");
  const [customScript, setCustomScript] = useState("");
  const [cta, setCta] = useState("Read the full story on Inkfeed.");
  const [kenBurns, setKenBurns] = useState(false);
  const [transition, setTransition] = useState<"none" | "fade">("fade");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicVolume, setMusicVolume] = useState(20);
  const [font, setFont] = useState<"sans" | "serif" | "mono">("sans");
  const [textColor, setTextColor] = useState("");
  const [textPosition, setTextPosition] = useState<"top" | "center" | "bottom">(
    "center",
  );
  const [uppercase, setUppercase] = useState(false);
  const [watermark, setWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState("Inkfeed");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Partial key so it matches regardless of whether the route param is a
  // slug or the article id.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["article"] });
    queryClient.invalidateQueries({ queryKey: ["articles"] });
  };

  const mutation = useMutation({
    mutationFn: (options: VideoOptionsInput) =>
      generateArticleVideo(article.id, options),
    onSuccess: () => {
      setOpen(false);
      // Optimistically flip to the queued state so the loader shows instantly.
      queryClient.setQueryData<ArticleResponse>(
        ["article", article.id],
        (prev) =>
          prev ? { ...prev, videoStatus: "PENDING", videoError: null } : prev,
      );
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteArticleVideo(article.id),
    onSuccess: () => {
      setConfirmDelete(false);
      invalidate();
    },
  });

  const previewMutation = useMutation({
    mutationFn: () =>
      previewVideoScript(article.id, {
        scriptSource: scriptSource === "custom" ? "custom" : scriptSource,
        customScript: customScript || undefined,
        scenes: sceneCount,
      }),
    onSuccess: (data) => setStoryboard(data.scenes),
  });

  const status = article.videoStatus;
  const busy = status === "PENDING" || status === "RENDERING";
  const ready = status === "READY" && !!article.videoUrl;

  const submit = () => {
    const imageUrls = imageText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const useStoryboard = storyboard.length > 0;
    mutation.mutate({
      voice,
      voiceRate,
      voicePitch,
      aspect,
      scenes: sceneCount,
      theme,
      quality,
      background: background === "cover" ? "cover" : "gradient",
      imageUrls: background === "custom" ? imageUrls : [],
      scriptSource: useStoryboard ? "custom" : scriptSource,
      customScript: useStoryboard
        ? serializeScenes(storyboard)
        : scriptSource === "custom"
          ? customScript
          : undefined,
      cta: cta.trim() || undefined,
      kenBurns,
      transition,
      musicUrl: musicUrl.trim() || undefined,
      musicVolume,
      font,
      textColor: textColor.trim() || undefined,
      textPosition,
      uppercase,
      watermark,
      watermarkText: watermark ? watermarkText.trim() || undefined : undefined,
      format,
    });
  };

  const updateScene = (
    index: number,
    key: keyof VideoScene,
    value: string,
  ) => {
    setStoryboard((prev) =>
      prev.map((scene, i) =>
        i === index ? { ...scene, [key]: value } : scene,
      ),
    );
  };

  return (
    <section className="mt-10 flex flex-col gap-5 border-t border-hairline pt-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline bg-canvas text-ink">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div>
            <h2 className="text-heading-md text-ink">Promo video</h2>
            <p className="mt-0.5 text-body-sm text-mute">
              A short vertical clip from this article — rendered locally, free.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={busy}
          className="btn-sm-primary shrink-0"
        >
          {busy ? "Rendering…" : ready ? "New video" : "Generate video"}
        </button>
      </div>

      {busy ? (
        <div className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas px-4 py-5">
          <svg className="h-4 w-4 shrink-0 animate-spin text-ink" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="text-body-md text-ink">Rendering your video…</p>
            <p className="text-body-sm text-mute">This can take a minute.</p>
          </div>
        </div>
      ) : status === "FAILED" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-error/20 bg-canvas p-4">
          <p className="text-body-sm text-error">
            {describeGenerationError(article.videoError) ||
              article.videoError ||
              "Video rendering failed. Try again."}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-sm-primary self-start"
          >
            Try again
          </button>
        </div>
      ) : ready ? (
        <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-elevated p-4 sm:flex-row">
          <video
            src={apiUrl(article.videoUrl as string)}
            controls
            playsInline
            className="w-full max-w-[240px] rounded-md border border-hairline bg-black sm:shrink-0"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-canvas px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                Ready
              </span>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteMutation.isPending}
                aria-label="Delete video"
                title="Delete video"
                className="rounded-md p-2 text-faint transition-colors hover:bg-hairline-soft hover:text-error disabled:opacity-40"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                </svg>
              </button>
            </div>
            <div className="mt-4 sm:mt-auto sm:pt-4">
              <a
                href={apiUrl(article.videoUrl as string)}
                download={`${article.slug ?? article.id}.mp4`}
                className="btn-sm-primary"
              >
                Download MP4
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-hairline bg-canvas px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-elevated text-ink">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <p className="text-body-md font-medium text-ink">No video yet</p>
          <p className="max-w-xs text-body-sm text-mute">
            Generate a short vertical clip with voiceover and captions.
          </p>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] w-full max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate promo video</DialogTitle>
            <DialogDescription>
              Uses your video script if you have one; otherwise it&apos;s written
              automatically.
            </DialogDescription>
          </DialogHeader>

          <div role="tablist" className="mt-5 flex gap-1 border-b border-hairline">
            {(
              [
                { id: "content", label: "Content" },
                { id: "style", label: "Style & audio" },
              ] as { id: ModalTab; label: string }[]
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.id)}
                  className={`-mb-px border-b-2 px-4 pb-3 pt-1 text-button-md transition-colors ${
                    active
                      ? "border-ink text-ink"
                      : "border-transparent text-mute hover:text-ink"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 min-h-[320px]">
            {tab === "content" ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Script</span>
                    <button
                      type="button"
                      onClick={() => previewMutation.mutate()}
                      disabled={previewMutation.isPending}
                      className="text-body-sm text-link transition-colors hover:text-link-deep disabled:opacity-50"
                    >
                      {previewMutation.isPending
                        ? "Loading…"
                        : storyboard.length
                          ? "Refresh storyboard"
                          : "Preview storyboard"}
                    </button>
                  </div>
                  <Segmented<ScriptSource>
                    value={scriptSource}
                    onChange={setScriptSource}
                    options={[
                      { id: "auto", label: "Use script / auto" },
                      { id: "rewrite", label: "Rewrite" },
                      { id: "custom", label: "Custom" },
                    ]}
                  />
                  {scriptSource === "custom" && (
                    <textarea
                      value={customScript}
                      onChange={(e) => setCustomScript(e.target.value)}
                      rows={5}
                      placeholder={"Hook line\n\nThe next point…\n\nCall to action."}
                      className="input-default font-mono text-body-sm"
                    />
                  )}
                </div>

                {storyboard.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="eyebrow">
                      Storyboard · {storyboard.length} scenes
                    </span>
                    {storyboard.map((scene, i) => (
                      <div
                        key={i}
                        className="group flex gap-3 rounded-lg border border-hairline bg-canvas p-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-[11px] text-white">
                          {i + 1}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <input
                            value={scene.text}
                            onChange={(e) =>
                              updateScene(i, "text", e.target.value)
                            }
                            placeholder="On-screen caption"
                            className="input-default"
                          />
                          <textarea
                            value={scene.narration}
                            onChange={(e) =>
                              updateScene(i, "narration", e.target.value)
                            }
                            rows={2}
                            placeholder="Narration"
                            className="input-default text-body-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setStoryboard((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                          aria-label={`Remove scene ${i + 1}`}
                          title="Remove scene"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-faint opacity-0 transition-all hover:bg-hairline-soft hover:text-error focus:opacity-100 group-hover:opacity-100"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setStoryboard((prev) => [
                          ...prev,
                          { text: "", narration: "" },
                        ])
                      }
                      className="btn-sm-ghost self-start"
                    >
                      Add scene
                    </button>
                  </div>
                )}

                {previewMutation.error instanceof Error && (
                  <p className="text-body-sm text-error">
                    {previewMutation.error.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1.5">
                  <span className="eyebrow">Type</span>
                  <Segmented<"short" | "full">
                    value={format}
                    onChange={(value) => {
                      setFormat(value);
                      setSceneCount(value === "full" ? 24 : 6);
                    }}
                    options={[
                      { id: "short", label: "Short promo" },
                      { id: "full", label: "Full article" },
                    ]}
                  />
                  <span className="text-body-sm text-faint">
                    {format === "full"
                      ? "Narrates the whole article, section by section."
                      : "A short hook + key points."}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="eyebrow">Aspect</span>
                    <Segmented<"9:16" | "1:1" | "16:9">
                      value={aspect}
                      onChange={setAspect}
                      options={ASPECTS.map((a) => ({
                        id: a.id,
                        label: a.label,
                      }))}
                    />
                  </div>
                  <Field label="Scenes">
                    <select
                      value={sceneCount}
                      onChange={(e) => setSceneCount(Number(e.target.value))}
                      className="input-default"
                    >
                      {(format === "full"
                        ? [5, 10, 15, 20, 24, 30, 40]
                        : [3, 4, 5, 6, 7, 8, 9, 10]
                      ).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Theme">
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as typeof theme)}
                      className="input-default"
                    >
                      {THEMES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Quality">
                    <select
                      value={quality}
                      onChange={(e) =>
                        setQuality(e.target.value as typeof quality)
                      }
                      className="input-default"
                    >
                      <option value="final">Final (1080p)</option>
                      <option value="preview">Preview (fast)</option>
                    </select>
                  </Field>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="eyebrow">Background</span>
                  <Segmented<Background>
                    value={background}
                    onChange={setBackground}
                    options={[
                      { id: "gradient", label: "Gradient" },
                      { id: "cover", label: "Article cover" },
                      { id: "custom", label: "Custom images" },
                    ]}
                  />
                  {background === "custom" && (
                    <textarea
                      value={imageText}
                      onChange={(e) => setImageText(e.target.value)}
                      rows={3}
                      placeholder={"https://…/photo-1.jpg\nhttps://…/photo-2.jpg"}
                      className="input-default mt-1 font-mono text-body-sm"
                    />
                  )}
                </div>

                <Field label="Voice">
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="input-default"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-body-sm text-mute">
                      Rate · {voiceRate > 0 ? "+" : ""}
                      {voiceRate}%
                    </span>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={5}
                      value={voiceRate}
                      onChange={(e) => setVoiceRate(Number(e.target.value))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-body-sm text-mute">
                      Pitch · {voicePitch > 0 ? "+" : ""}
                      {voicePitch}Hz
                    </span>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      step={5}
                      value={voicePitch}
                      onChange={(e) => setVoicePitch(Number(e.target.value))}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Transitions">
                    <select
                      value={transition}
                      onChange={(e) =>
                        setTransition(e.target.value as "none" | "fade")
                      }
                      className="input-default"
                    >
                      <option value="fade">Fade</option>
                      <option value="none">None</option>
                    </select>
                  </Field>
                  <label className="flex items-center justify-between gap-3 pt-6">
                    <span className="text-body-md text-ink">Ken Burns zoom</span>
                    <input
                      type="checkbox"
                      checked={kenBurns}
                      onChange={(e) => setKenBurns(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>
                </div>

                <Field label="Background music URL (optional)">
                  <input
                    value={musicUrl}
                    onChange={(e) => setMusicUrl(e.target.value)}
                    placeholder="https://…/music.mp3"
                    className="input-default"
                  />
                </Field>
                <label className="flex flex-col gap-1">
                  <span className="text-body-sm text-mute">
                    Music volume · {musicVolume}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                  />
                </label>

                <div className="flex flex-col gap-3">
                  <span className="eyebrow">Text</span>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Font">
                      <select
                        value={font}
                        onChange={(e) =>
                          setFont(e.target.value as typeof font)
                        }
                        className="input-default"
                      >
                        <option value="sans">Sans</option>
                        <option value="serif">Serif</option>
                        <option value="mono">Mono</option>
                      </select>
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      <span className="eyebrow">Position</span>
                      <Segmented<"top" | "center" | "bottom">
                        value={textPosition}
                        onChange={setTextPosition}
                        options={[
                          { id: "top", label: "Top" },
                          { id: "center", label: "Middle" },
                          { id: "bottom", label: "Bottom" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="eyebrow">Text color</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={textColor || "#f5f5f4"}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="h-9 w-12 shrink-0 cursor-pointer rounded-sm border border-hairline bg-elevated"
                          aria-label="Text color"
                        />
                        <input
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          placeholder="Theme default"
                          className="input-default"
                        />
                      </div>
                    </div>
                    <label className="flex items-center justify-between gap-3 pt-6">
                      <span className="text-body-md text-ink">Uppercase</span>
                      <input
                        type="checkbox"
                        checked={uppercase}
                        onChange={(e) => setUppercase(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </label>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center justify-between gap-3">
                      <span className="text-body-md text-ink">Watermark</span>
                      <input
                        type="checkbox"
                        checked={watermark}
                        onChange={(e) => setWatermark(e.target.checked)}
                        className="h-4 w-4"
                      />
                    </label>
                    {watermark && (
                      <input
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder="Inkfeed"
                        className="input-default"
                      />
                    )}
                  </div>
                </div>

                <Field label="Closing line (CTA)">
                  <input
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Read the full story on Inkfeed."
                    className="input-default"
                  />
                </Field>
              </div>
            )}
          </div>

          {mutation.error instanceof Error && (
            <p className="mt-4 text-body-sm text-error">
              {mutation.error.message}
            </p>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-sm-ghost"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={mutation.isPending}
              className="btn-sm-primary"
            >
              {mutation.isPending ? "Queuing…" : "Generate video"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this video?"
        description="The rendered MP4 will be permanently removed."
        confirmLabel="Delete"
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </section>
  );
}
