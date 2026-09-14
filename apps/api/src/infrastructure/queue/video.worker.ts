import { Injectable, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { GenerateVideoUseCase } from "../../application/commands/generate-video.command.js";
import type {
  ArticleRepository,
  EventPublisher,
} from "../../domain/index.js";
import type { VideoJobData } from "@repo/queue";

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

@Injectable()
export class VideoWorker implements OnModuleDestroy {
  private readonly logger = new Logger(VideoWorker.name);
  private readonly worker: Worker<VideoJobData>;

  constructor(
    private readonly generateVideo: GenerateVideoUseCase,
    @Inject("ArticleRepository")
    private readonly articles: ArticleRepository,
    @Inject("EventPublisher") private readonly events: EventPublisher,
  ) {
    this.worker = new Worker<VideoJobData>(
      "videos",
      async (job: Job<VideoJobData>) => {
        const { userId, articleId } = job.data;

        this.events.publishToUser(userId, {
          type: "progress",
          articleId,
          status: "SYNTHESIZING",
          message: "Rendering video…",
          timestamp: Date.now(),
        });

        await this.generateVideo.execute(articleId, job.data.options);

        this.events.publishToUser(userId, {
          type: "completed",
          articleId,
          timestamp: Date.now(),
        });
      },
      { connection, concurrency: 1 },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Video job ${job?.id} failed: ${err.message}`);
      if (!job?.data) return;

      const attempts = job.opts.attempts ?? 1;
      const exhausted =
        job.attemptsMade >= attempts || /stalled/i.test(err.message);
      if (exhausted) {
        void this.articles
          .updateVideo(job.data.articleId, {
            status: "FAILED",
            error: err.message,
          })
          .catch(() => undefined);
      }

      this.events.publishToUser(job.data.userId, {
        type: "failed",
        articleId: job.data.articleId,
        error: err.message,
        timestamp: Date.now(),
      });
    });
  }

  onModuleDestroy() {
    void this.worker.close();
  }
}
