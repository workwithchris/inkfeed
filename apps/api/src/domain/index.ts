import type {
  AppEvent,
  PublishPlatform,
  PublishStatus,
  AiProvider,
  AiProviderId,
  DerivativeKind,
  DerivativeStatus,
  Derivative,
  SourceType,
} from "@repo/types";

export type {
  PublishPlatform,
  PublishStatus,
  AiProvider,
  AiProviderId,
  DerivativeKind,
  DerivativeStatus,
  Derivative,
  SourceType,
};

// ─── Domain Entities (Pure - No ORM Dependencies) ─────────
export interface Article {
  id: string;
  userId: string;
  youtubeUrl: string;
  videoId: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceItemUrl: string | null;
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
  viewCount: number;
  videoUrl: string | null;
  videoStatus: VideoStatus | null;
  videoError: string | null;
  status: JobStatus;
  transcript: string | null;
  durationSeconds: number | null;
  channel: string | null;
  aiModel: string | null;
  aiSource: "user" | "platform" | null;
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

export type VideoStatus = "PENDING" | "RENDERING" | "READY" | "FAILED";

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
  findSitePublishedByUserId(userId: string): Promise<Article[]>;
  findSitePublishedFeed(query: PublicFeedQuery): Promise<PublicFeedResult>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  updateTranscript(id: string, data: TranscriptData): Promise<void>;
  updateContent(id: string, data: ContentData): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  markCompleted(id: string): Promise<void>;
  updateEditable(id: string, data: EditableContentData): Promise<void>;
  updateVideo(
    id: string,
    data: {
      status: VideoStatus;
      videoUrl?: string | null;
      error?: string | null;
    },
  ): Promise<void>;
  clearVideo(id: string): Promise<void>;
  incrementView(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface PublicFeedQuery {
  limit: number;
  offset: number;
  tag?: string;
}

export interface PublicFeedEntry {
  article: Article;
  authorUsername: string | null;
  authorName: string | null;
  authorImageUrl: string | null;
}

export interface PublicFeedResult {
  items: PublicFeedEntry[];
  total: number;
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
  readingTimeMinutes?: number | null;
}

// ─── Users ────────────────────────────────────────────────
export interface User {
  id: string;
  clerkUserId: string | null;
  email: string;
  username: string | null;
  name: string | null;
  imageUrl: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByClerkId(clerkUserId: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  upsertFromClerk(data: {
    clerkUserId: string;
    email: string;
    name: string | null;
    imageUrl?: string | null;
  }): Promise<User>;
  updateUsername(userId: string, username: string): Promise<User>;
  updateImage(userId: string, imageUrl: string): Promise<User>;
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
  responseStatus: number | null;
  responseBody: string | null;
  scheduledFor: Date | null;
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
    scheduledFor?: Date | null;
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
      responseStatus?: number | null;
      responseBody?: string | null;
    },
  ): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Repurposing (article derivatives) ────────────────────
export interface DerivativeRepository {
  create(data: {
    articleId: string;
    userId: string;
    kind: DerivativeKind;
  }): Promise<Derivative>;
  findById(id: string): Promise<Derivative | null>;
  findByArticleId(articleId: string): Promise<Derivative[]>;
  updateStatus(
    id: string,
    status: DerivativeStatus,
    errorMessage?: string | null,
  ): Promise<void>;
  updateContent(
    id: string,
    data: { content: string; aiModel: string },
  ): Promise<void>;
  updateEditable(id: string, content: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface PublishDraft {
  articleId: string;
  userId: string;
  username: string | null;
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
  responseStatus?: number | null;
  responseBody?: string | null;
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
  sourceType: SourceType;
  sourceUrl: string | null;
  sourceItemUrl: string | null;
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
  aiSource: "user" | "platform";
  metaTitle: string;
  metaDescription: string;
  slug: string;
  keywords: string[];
  tags: string[];
  readingTimeMinutes: number;
  coverImageUrl: string | null;
}

export interface ExtractedContent {
  title: string;
  text: string;
  durationSeconds: number | null;
  channel: string | null;
}

export interface FeedItem {
  title: string;
  link: string | null;
  audioUrl: string | null;
  publishedAt: string | null;
  summary: string | null;
}

export interface FeedListing {
  title: string;
  items: FeedItem[];
}

export interface PlaylistItem {
  videoId: string;
  url: string;
  title: string;
  durationSeconds: number | null;
  channel: string | null;
}

export interface PlaylistListing {
  title: string;
  items: PlaylistItem[];
}

export interface ConverterService {
  extractUrl(url: string): Promise<ExtractedContent>;
  extractFile(input: { filename: string; data: Buffer }): Promise<ExtractedContent>;
  extractFeedItem(input: {
    feedUrl: string;
    itemUrl: string;
  }): Promise<ExtractedContent>;
  listFeedItems(url: string): Promise<FeedListing>;
  listPlaylistItems(url: string): Promise<PlaylistListing>;
  renderVideo(input: {
    title: string;
    scenes: { text: string; narration?: string }[];
    author: string | null;
    subtitle: string | null;
    coverUrl: string | null;
    imageUrls?: string[];
    aspect?: "9:16" | "1:1" | "16:9";
    theme?: "ink" | "slate" | "noir" | "light";
    quality?: "preview" | "final";
    voice?: string | null;
    voiceRate?: number;
    voicePitch?: number;
    kenBurns?: boolean;
    transition?: "none" | "fade";
    musicUrl?: string | null;
    musicVolume?: number;
    font?: "sans" | "serif" | "mono";
    textColor?: string | null;
    textPosition?: "top" | "center" | "bottom";
    uppercase?: boolean;
    watermark?: boolean;
    watermarkText?: string | null;
  }): Promise<Buffer>;
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
