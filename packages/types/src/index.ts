// ─── Job States ───────────────────────────────────────────
export type JobStatus =
  | "PENDING"
  | "EXTRACTING"
  | "SYNTHESIZING"
  | "COMPLETED"
  | "FAILED";

// ─── Domain Entities ──────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Article {
  id: string;
  userId: string;
  youtubeUrl: string;
  title: string;
  content: string;
  summary: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  keywords: string[] | null;
  tags: string[] | null;
  readingTimeMinutes: number | null;
  coverImageUrl: string | null;
  status: JobStatus;
  transcript: string | null;
  durationSeconds: number | null;
  channel: string | null;
  videoId: string;
  aiModel: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

// ─── DTOs ─────────────────────────────────────────────────
export interface CreateArticleDto {
  youtubeUrl: string;
}

export interface ArticleResponseDto {
  id: string;
  youtubeUrl: string;
  title: string;
  content: string;
  summary: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  slug: string | null;
  keywords: string[] | null;
  tags: string[] | null;
  readingTimeMinutes: number | null;
  coverImageUrl: string | null;
  status: JobStatus;
  durationSeconds: number | null;
  channel: string | null;
  videoId: string;
  createdAt: Date;
  completedAt: Date | null;
}

// ─── SSE Events ───────────────────────────────────────────
export interface JobProgressEvent {
  type: "progress";
  articleId: string;
  status: JobStatus;
  message: string;
  timestamp: number;
}

export interface JobCompletedEvent {
  type: "completed";
  articleId: string;
  article?: ArticleResponseDto;
  timestamp: number;
}

export interface JobFailedEvent {
  type: "failed";
  articleId: string;
  error: string;
  timestamp: number;
}

export type SseEvent = JobProgressEvent | JobCompletedEvent | JobFailedEvent;

// ─── Publishing ───────────────────────────────────────────
export type PublishPlatform =
  | "devto"
  | "hashnode"
  | "blogger"
  | "linkedin"
  | "github";

export type PublishStatus = "PENDING" | "PUBLISHING" | "PUBLISHED" | "FAILED";

export interface Connection {
  id: string;
  userId: string;
  platform: PublishPlatform;
  blogId: string | null;
  blogName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Publication {
  id: string;
  articleId: string;
  connectionId: string;
  userId: string;
  platform: PublishPlatform;
  status: PublishStatus;
  externalId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConnectionDto {
  platform: PublishPlatform;
  credential: string;
  blogId?: string;
}

export interface UpdateArticleDto {
  title?: string;
  content?: string;
}

export interface PublishArticleDto {
  connectionId: string;
  includeCoverImage?: boolean;
}

// ─── SSE Events (publishing) ──────────────────────────────
export interface PublishProgressEvent {
  type: "publish-progress";
  articleId: string;
  publicationId: string;
  status: PublishStatus;
  message: string;
  timestamp: number;
}

export interface PublishCompletedEvent {
  type: "publish-completed";
  articleId: string;
  publicationId: string;
  url: string;
  timestamp: number;
}

export interface PublishFailedEvent {
  type: "publish-failed";
  articleId: string;
  publicationId: string;
  error: string;
  timestamp: number;
}

export type PublishSseEvent =
  | PublishProgressEvent
  | PublishCompletedEvent
  | PublishFailedEvent;

export type AppEvent = SseEvent | PublishSseEvent;

// ─── Converter Service ────────────────────────────────────
export interface ExtractRequest {
  url: string;
}

export interface ExtractResponse {
  title: string;
  transcript: string;
  duration_seconds: number | null;
  channel: string | null;
}

// ─── AI Types ─────────────────────────────────────────────
export interface AiTransformRequest {
  transcript: string;
  title: string;
  style?: "blog" | "newsletter" | "academic";
}

export interface AiSeoMeta {
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
  tags: string[];
}

export interface AiTransformResponse {
  content: string;
  summary: string;
  model: string;
  seo: AiSeoMeta;
}

// ─── AI Providers (BYOK) ──────────────────────────────────
// Preset ids resolved by @ai-router/core, plus the raw adapter ids.
export const AI_PROVIDER_IDS = [
  "openai",
  "anthropic",
  "gemini",
  "deepseek",
  "groq",
  "mistral",
  "openrouter",
  "xai",
  "openai-compatible",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface AiProvider {
  id: string;
  userId: string;
  provider: AiProviderId;
  model: string;
  label: string | null;
  baseUrl: string | null;
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAiProviderDto {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  label?: string;
  baseUrl?: string;
}

export interface UpdateAiProviderDto {
  label?: string;
  model?: string;
  enabled?: boolean;
  priority?: number;
}

// A single routing candidate built from a stored provider.
export interface AiRoute {
  id: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}
