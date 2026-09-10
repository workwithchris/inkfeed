import { Injectable, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { GenerateDerivativeUseCase } from "../../application/commands/generate-derivative.command";
import type { EventPublisher } from "../../domain/index";
import type { DerivativeJobData } from "@repo/queue";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  { maxRetriesPerRequest: null },
);

@Injectable()
export class DerivativeWorker implements OnModuleDestroy {
  private readonly logger = new Logger(DerivativeWorker.name);
  private readonly worker: Worker<DerivativeJobData>;

  constructor(
    private readonly generateDerivative: GenerateDerivativeUseCase,
    @Inject("EventPublisher") private readonly events: EventPublisher,
  ) {
    this.worker = new Worker<DerivativeJobData>(
      "derivatives",
      async (job: Job<DerivativeJobData>) => {
        const { userId, articleId, derivativeId } = job.data;

        this.events.publishToUser(userId, {
          type: "derivative-progress",
          articleId,
          derivativeId,
          status: "SYNTHESIZING",
          message: "Repurposing…",
          timestamp: Date.now(),
        });

        await this.generateDerivative.execute(derivativeId);

        this.events.publishToUser(userId, {
          type: "derivative-completed",
          articleId,
          derivativeId,
          timestamp: Date.now(),
        });
      },
      { connection, concurrency: 3 },
    );

    this.worker.on("failed", (job, err) => {
      this.logger.error(`Derivative job ${job?.id} failed: ${err.message}`);
      if (job?.data) {
        this.events.publishToUser(job.data.userId, {
          type: "derivative-failed",
          articleId: job.data.articleId,
          derivativeId: job.data.derivativeId,
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
