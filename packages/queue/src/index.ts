import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import type { JobStatus } from "@repo/types";

// ─── Connection ───────────────────────────────────────────
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// ─── Queue Names ──────────────────────────────────────────
export const QUEUE_NAMES = {
  ARTICLES: "articles",
  PUBLISHES: "publishes",
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
