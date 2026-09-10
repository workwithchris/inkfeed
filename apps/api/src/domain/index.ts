import type {
  AppEvent,
  PublishPlatform,
  PublishStatus,
  AiProvider,
  AiProviderId,
} from "@repo/types";

export type { PublishPlatform, PublishStatus, AiProvider, AiProviderId };

// ─── Domain Entities (Pure - No ORM Dependencies) ─────────
export interface Article {
  id: string;
  userId: string;
  youtubeUrl: string;
  videoId: string;
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
  aiModel: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export type JobStatus =
  | "PENDING"
  | "EXTRACTING"
  | "SYNTHESIZING"
  | "COMPLETED"
  | "FAILED";

// ─── Value Objects ────────────────────────────────────────
export interface YouTubeUrl {
  value: string;
  videoId: string;
}

// ─── Port Interfaces ──────────────────────────────────────
export interface ArticleRepository {
  create(data: CreateArticleData): Promise<Article>;
  findById(id: string): Promise<Article | null>;
  findBySlug(slug: string): Promise<Article | null>;
  findByUserId(userId: string): Promise<Article[]>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  updateTranscript(id: string, data: TranscriptData): Promise<void>;
  updateContent(id: string, data: ContentData): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  updateEditable(id: string, data: EditableContentData): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface EditableContentData {
  title?: string;
  content?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  slug?: string | null;
  keywords?: string[] | null;
  tags?: string[] | null;
  coverImageUrl?: string | null;
}

// ─── Users ────────────────────────────────────────────────
export interface User {
  id: string;
  clerkUserId: string | null;
  email: string;
  name: string | null;
}

export interface UserRepository {
  findByClerkId(clerkUserId: string): Promise<User | null>;
  upsertFromClerk(data: {
    clerkUserId: string;
    email: string;
    name: string | null;
  }): Promise<User>;
}

// ─── Publishing ───────────────────────────────────────────
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

export interface ConnectionRepository {
  create(data: {
    userId: string;
    platform: PublishPlatform;
    credentialEnc: string;
    blogId: string | null;
    blogName: string | null;
  }): Promise<Connection>;
  findById(id: string): Promise<(Connection & { credentialEnc: string }) | null>;
  findByUserId(userId: string): Promise<Connection[]>;
  delete(id: string): Promise<void>;
}

export interface PublishRepository {
  create(data: {
    articleId: string;
    connectionId: string;
    userId: string;
    platform: PublishPlatform;
  }): Promise<Publication>;
  findById(id: string): Promise<Publication | null>;
  findByArticleId(articleId: string): Promise<Publication[]>;
  findByUserId(userId: string): Promise<Publication[]>;
  updateStatus(
    id: string,
    data: {
      status: PublishStatus;
      externalId?: string | null;
      externalUrl?: string | null;
      errorMessage?: string | null;
    },
  ): Promise<void>;
}

export interface PublishDraft {
  title: string;
  content: string;
  summary: string | null;
  tags: string[];
  slug: string | null;
  canonicalUrl: string | null;
  coverImageUrl: string | null;
}

export interface PublishResult {
  externalId: string;
  url: string;
}

export interface BlogPublisher {
  readonly platform: PublishPlatform;
  validate(
    credential: string,
    blogId?: string | null,
  ): Promise<{
    blogId: string | null;
    blogName: string | null;
  }>;
  publish(credential: string, blogId: string | null, draft: PublishDraft): Promise<PublishResult>;
}

export interface CreateArticleData {
  userId: string;
  youtubeUrl: string;
  videoId: string;
  title?: string;
  channel?: string | null;
}

export interface TranscriptData {
  title: string;
  transcript: string;
  durationSeconds: number | null;
  channel: string | null;
}

export interface ContentData {
  content: string;
  summary: string;
  aiModel: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
  tags: string[];
  readingTimeMinutes: number;
  coverImageUrl: string | null;
}

export interface ConverterService {
  extractTranscript(url: string): Promise<{
    title: string;
    transcript: string;
    durationSeconds: number | null;
    channel: string | null;
  }>;
}

export interface ArticlePublisher {
  publish(articleId: string): Promise<void>;
}

export interface EventPublisher {
  publishToUser(userId: string, event: AppEvent): void;
}

// ─── AI Providers (BYOK) ──────────────────────────────────
export interface AiProviderRepository {
  create(data: {
    userId: string;
    provider: AiProviderId;
    model: string;
    label: string | null;
    baseUrl: string | null;
    apiKeyEnc: string;
    priority: number;
  }): Promise<AiProvider>;
  findById(id: string): Promise<(AiProvider & { apiKeyEnc: string }) | null>;
  findEnabledByUserId(
    userId: string,
  ): Promise<(AiProvider & { apiKeyEnc: string })[]>;
  findByUserId(userId: string): Promise<AiProvider[]>;
  update(
    id: string,
    data: {
      label?: string | null;
      model?: string;
      enabled?: boolean;
      priority?: number;
    },
  ): Promise<AiProvider>;
  delete(id: string): Promise<void>;
}
