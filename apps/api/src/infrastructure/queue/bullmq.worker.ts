import { Injectable, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { ProcessArticleUseCase } from "../../application/commands/process-article.command.js";
import type { EventPublisher } from "../../domain/index.js";

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

@Injectable()
export class BullMQWorker implements OnModuleDestroy {
  private readonly logger = new Logger(BullMQWorker.name);
  private readonly worker: Worker;

  constructor(
    private readonly processArticle: ProcessArticleUseCase,
    @Inject("EventPublisher") private readonly events: EventPublisher,
  ) {
    this.worker = new Worker(
      "articles",
      async (job: Job) => {
        this.logger.log(`Processing job ${job.id} for article ${job.data.articleId}`);

        const regenerate = job.data.regenerate === true;

        this.events.publishToUser(job.data.userId, {
          type: "progress",
          articleId: job.data.articleId,
          status: regenerate ? "SYNTHESIZING" : "EXTRACTING",
          message: regenerate
            ? "Rewriting article..."
            : "Starting extraction...",
          timestamp: Date.now(),
        });

        await this.processArticle.execute(job.data.articleId, {
          reuseTranscript: regenerate,
        });

        this.events.publishToUser(job.data.userId, {
          type: "completed",
          articleId: job.data.articleId,
          timestamp: Date.now(),
        });
      },
      {
        connection,
        concurrency: 5,
      },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
      if (job?.data) {
        this.events.publishToUser(job.data.userId, {
          type: "failed",
          articleId: job.data.articleId,
          error: err.message,
          timestamp: Date.now(),
        });
      }
    });
  }

  onModuleDestroy() {
    void this.worker.close();
  }
}
