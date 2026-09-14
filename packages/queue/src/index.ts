import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import type { JobStatus, DerivativeKind } from "@repo/types";

// ─── Connection ───────────────────────────────────────────
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// ─── Queue Names ──────────────────────────────────────────
export const QUEUE_NAMES = {
  ARTICLES: "articles",
  PUBLISHES: "publishes",
  DERIVATIVES: "derivatives",
  VIDEOS: "videos",
} as const;

// ─── Job Data ─────────────────────────────────────────────
export interface ArticleJobData {
  articleId: string;
  youtubeUrl: string;
  videoId: string;
  userId: string;
  /** Re-synthesize from the stored transcript instead of re-extracting. */
  regenerate?: boolean;
}

export interface PublishJobData {
  publicationId: string;
  articleId: string;
  connectionId: string;
  userId: string;
  includeCoverImage: boolean;
  title?: string;
  coverImageUrl?: string;
}

export interface DerivativeJobData {
  derivativeId: string;
  articleId: string;
  userId: string;
  kind: DerivativeKind;
}

export interface VideoOptions {
  voice?: string | null;
  voiceRate?: number;
  voicePitch?: number;
  background?: "gradient" | "cover";
  imageUrls?: string[];
  theme?: "ink" | "slate" | "noir" | "light";
  aspect?: "9:16" | "1:1" | "16:9";
  scenes?: number;
  quality?: "preview" | "final";
  cta?: string | null;
  scriptSource?: "auto" | "rewrite" | "custom";
  customScript?: string | null;
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
  format?: "short" | "full";
}

export interface VideoJobData {
  articleId: string;
  userId: string;
  options?: VideoOptions;
}

// ─── State Machine ────────────────────────────────────────
export const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  PENDING: ["EXTRACTING", "FAILED"],
  EXTRACTING: ["SYNTHESIZING", "FAILED"],
  SYNTHESIZING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return JOB_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Queue ────────────────────────────────────────────────
export const articleQueue = new Queue<ArticleJobData>(QUEUE_NAMES.ARTICLES, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

// ─── Publish Queue ────────────────────────────────────────
export const publishQueue = new Queue<PublishJobData>(QUEUE_NAMES.PUBLISHES, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

// ─── Derivative Queue ─────────────────────────────────────
export const derivativeQueue = new Queue<DerivativeJobData>(
  QUEUE_NAMES.DERIVATIVES,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 604800 },
    },
  },
);

// ─── Video Queue ──────────────────────────────────────────
export const videoQueue = new Queue<VideoJobData>(QUEUE_NAMES.VIDEOS, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

// ─── Worker ───────────────────────────────────────────────
export function createArticleWorker(
  processor: (job: Job<ArticleJobData>) => Promise<void>,
): Worker<ArticleJobData> {
  return new Worker<ArticleJobData>(QUEUE_NAMES.ARTICLES, processor, {
    connection,
    concurrency: 5,
  });
}

export { connection as redisConnection };
