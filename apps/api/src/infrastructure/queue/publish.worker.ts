import { Injectable, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { PublishArticleUseCase } from "../../application/commands/publish-article.command";
import type { EventPublisher } from "../../domain/index";
import type { PublishJobData } from "@repo/queue";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

@Injectable()
export class PublishWorker implements OnModuleDestroy {
  private readonly logger = new Logger(PublishWorker.name);
  private readonly worker: Worker<PublishJobData>;

  constructor(
    private readonly publishArticle: PublishArticleUseCase,
    @Inject("EventPublisher") private readonly events: EventPublisher,
  ) {
    this.worker = new Worker<PublishJobData>(
      "publishes",
      async (job: Job<PublishJobData>) => {
        const { userId, articleId, publicationId, includeCoverImage } =
          job.data;

        this.events.publishToUser(userId, {
          type: "publish-progress",
          articleId,
          publicationId,
          status: "PUBLISHING",
          message: "Publishing…",
          timestamp: Date.now(),
        });

        const result = await this.publishArticle.execute(
          publicationId,
          includeCoverImage,
        );

        this.events.publishToUser(userId, {
          type: "publish-completed",
          articleId,
          publicationId,
          url: result.url,
          timestamp: Date.now(),
        });
      },
      { connection, concurrency: 3 },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Publish job ${job?.id} failed: ${err.message}`);
      if (job?.data) {
        this.events.publishToUser(job.data.userId, {
          type: "publish-failed",
          articleId: job.data.articleId,
          publicationId: job.data.publicationId,
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
