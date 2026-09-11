import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Sse,
  MessageEvent,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import {
  CreateArticleDto,
  CreateManualArticleDto,
  UploadArticleDto,
} from "../../application/dtos/create-article.dto.js";
import {
  UpdateArticleDto,
  PublishArticleDto,
} from "../../application/dtos/connection.dto.js";
import {
  CreateDerivativeDto,
  UpdateDerivativeDto,
} from "../../application/dtos/derivative.dto.js";
import { GetArticleQuery, ListArticlesQuery } from "../../application/queries/get-article.query.js";
import { UpdateArticleUseCase } from "../../application/commands/update-article.command.js";
import type {
  ArticleRepository,
  ConnectionRepository,
  ConverterService,
  DerivativeRepository,
  PublishRepository,
} from "../../domain/index.js";
import { SseService } from "../sse/sse.service.js";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard.js";
import { articleQueue, derivativeQueue, publishQueue } from "@repo/queue";
import type { Request } from "express";

async function fetchYouTubeMetadata(
  url: string,
): Promise<{ title: string; channel: string | null }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return { title: "", channel: null };
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
    };
    return { title: data.title ?? "", channel: data.author_name ?? null };
  } catch {
    return { title: "", channel: null };
  }
}

@Controller("api/articles")
@UseGuards(ClerkAuthGuard)
export class ArticleController {
  constructor(
    private readonly getArticleQuery: GetArticleQuery,
    private readonly listArticlesQuery: ListArticlesQuery,
    private readonly updateArticle: UpdateArticleUseCase,
    @Inject("ArticleRepository") private readonly articleRepo: ArticleRepository,
    @Inject("ConnectionRepository")
    private readonly connectionRepo: ConnectionRepository,
    @Inject("PublishRepository") private readonly publishRepo: PublishRepository,
    @Inject("DerivativeRepository")
    private readonly derivativeRepo: DerivativeRepository,
    @Inject("ConverterService")
    private readonly converter: ConverterService,
    private readonly sseService: SseService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateArticleDto,
    @Req() req: Request & { userId: string },
  ) {
    if (dto.sourceType === "feed" && !dto.itemUrl) {
      throw new BadRequestException("Select an episode from the feed");
    }

    let videoId = "";
    let title = "";
    let channel: string | null = null;

    if (dto.sourceType === "youtube") {
      const match = dto.url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      );
      videoId = match?.[1] ?? "";
      if (!videoId) throw new BadRequestException("Invalid YouTube URL");

      const metadata = await fetchYouTubeMetadata(dto.url);
      title = metadata.title;
      channel = metadata.channel;
    }

    const article = await this.articleRepo.create({
      userId: req.userId,
      youtubeUrl: dto.sourceType === "youtube" ? dto.url : "",
      videoId,
      sourceType: dto.sourceType,
      sourceUrl: dto.url,
      sourceItemUrl: dto.itemUrl ?? null,
      title,
      channel,
    });

    await articleQueue.add("process-article", {
      articleId: article.id,
      youtubeUrl: article.youtubeUrl,
      videoId,
      userId: req.userId,
    });

    return { id: article.id, status: article.status };
  }

  // Start an article from scratch with no source. It is created empty and
  // immediately editable, bypassing the extraction/synthesis pipeline.
  @Post("manual")
  @HttpCode(HttpStatus.CREATED)
  async createManual(
    @Body() dto: CreateManualArticleDto,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.create({
      userId: req.userId,
      youtubeUrl: "",
      videoId: "",
      sourceType: "manual",
      sourceUrl: null,
      sourceItemUrl: null,
      title: dto.title?.trim() ?? "",
      channel: null,
    });

    await this.articleRepo.markCompleted(article.id);

    return { id: article.id, status: "COMPLETED" };
  }

  // Documents (PDF/DOCX) are extracted up-front so the bytes need not be
  // persisted, then the worker runs synthesis from the stored text.
  @Post("upload")
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Body() dto: UploadArticleDto,
    @Req() req: Request & { userId: string },
  ) {
    const buffer = Buffer.from(dto.contentBase64, "base64");
    if (buffer.length === 0) {
      throw new BadRequestException("The uploaded file is empty");
    }
    if (buffer.length > 15 * 1024 * 1024) {
      throw new BadRequestException("File too large (max 15MB)");
    }

    const extracted = await this.converter.extractFile({
      filename: dto.filename,
      data: buffer,
    });

    const article = await this.articleRepo.create({
      userId: req.userId,
      youtubeUrl: "",
      videoId: "",
      sourceType: "document",
      sourceUrl: null,
      sourceItemUrl: null,
      title: extracted.title,
      channel: null,
    });

    await this.articleRepo.updateTranscript(article.id, {
      title: extracted.title,
      transcript: extracted.text,
      durationSeconds: extracted.durationSeconds,
      channel: extracted.channel,
    });

    await articleQueue.add("process-article", {
      articleId: article.id,
      youtubeUrl: "",
      videoId: "",
      userId: req.userId,
      regenerate: true,
    });

    return { id: article.id, status: article.status };
  }

  @Get()
  async list(@Req() req: Request & { userId: string }) {
    return this.listArticlesQuery.execute(req.userId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.getArticleQuery.execute(id);
  }

  @Patch(":id")
  async edit(
    @Param("id") id: string,
    @Body() dto: UpdateArticleDto,
    @Req() req: Request & { userId: string },
  ) {
    return this.updateArticle.execute(id, req.userId, {
      title: dto.title,
      content: dto.content,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      slug: dto.slug,
      keywords: dto.keywords,
      tags: dto.tags,
      coverImageUrl: dto.coverImageUrl,
    });
  }

  @Post(":id/regenerate")
  @HttpCode(HttpStatus.ACCEPTED)
  async regenerate(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.findById(id);
    if (!article || article.userId !== req.userId) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    const canReuseTranscript = !!article.transcript;
    await this.articleRepo.updateStatus(
      id,
      canReuseTranscript ? "SYNTHESIZING" : "PENDING",
    );

    await articleQueue.add("process-article", {
      articleId: id,
      youtubeUrl: article.youtubeUrl,
      videoId: article.videoId,
      userId: req.userId,
      regenerate: canReuseTranscript,
    });

    return {
      id,
      status: canReuseTranscript ? "SYNTHESIZING" : "PENDING",
    };
  }

  @Post(":id/publish")
  @HttpCode(HttpStatus.CREATED)
  async publish(
    @Param("id") id: string,
    @Body() dto: PublishArticleDto,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.findById(id);
    if (!article || article.userId !== req.userId) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    const connection = await this.connectionRepo.findById(dto.connectionId);
    if (!connection || connection.userId !== req.userId) {
      throw new NotFoundException(`Connection ${dto.connectionId} not found`);
    }

    const scheduledFor = dto.scheduledFor ? new Date(dto.scheduledFor) : null;
    const scheduled =
      scheduledFor !== null && scheduledFor.getTime() > Date.now();
    if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
      throw new BadRequestException("scheduledFor must be a valid date");
    }

    const publication = await this.publishRepo.create({
      articleId: id,
      connectionId: dto.connectionId,
      userId: req.userId,
      platform: connection.platform,
      scheduledFor: scheduled ? scheduledFor : null,
    });

    await publishQueue.add(
      "publish-article",
      {
        publicationId: publication.id,
        articleId: id,
        connectionId: dto.connectionId,
        userId: req.userId,
        includeCoverImage: dto.includeCoverImage ?? true,
        title: dto.title,
        coverImageUrl: dto.coverImageUrl,
      },
      {
        jobId: publication.id,
        ...(scheduled ? { delay: scheduledFor!.getTime() - Date.now() } : {}),
      },
    );

    return { publicationId: publication.id, status: publication.status };
  }

  @Delete(":id/publications/:publicationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelScheduledPublish(
    @Param("id") id: string,
    @Param("publicationId") publicationId: string,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.findById(id);
    if (!article || article.userId !== req.userId) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    const publication = await this.publishRepo.findById(publicationId);
    if (
      !publication ||
      publication.articleId !== id ||
      publication.userId !== req.userId
    ) {
      throw new NotFoundException(`Publication ${publicationId} not found`);
    }
    if (publication.status !== "SCHEDULED" && publication.status !== "PENDING") {
      throw new BadRequestException("This publication has already started");
    }

    try {
      const job = await publishQueue.getJob(publicationId);
      if (job) await job.remove();
    } catch {
      // Best-effort; a job already locked by a worker can't be removed.
    }
    await this.publishRepo.delete(publicationId);
  }

  @Delete(":id/site")
  @HttpCode(HttpStatus.NO_CONTENT)
  async unpublishSite(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.findById(id);
    if (!article || article.userId !== req.userId) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    const publications = await this.publishRepo.findByArticleId(id);
    await Promise.all(
      publications
        .filter((p) => p.platform === "site")
        .map((p) => this.publishRepo.delete(p.id)),
    );
  }

  @Get(":id/publications")
  async publications(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.findById(id);
    if (!article || article.userId !== req.userId) {
      throw new NotFoundException(`Article ${id} not found`);
    }
    return this.publishRepo.findByArticleId(id);
  }

  // ─── Repurposing (derivatives) ─────────────────────────
  @Post(":id/derivatives")
  @HttpCode(HttpStatus.CREATED)
  async createDerivative(
    @Param("id") id: string,
    @Body() dto: CreateDerivativeDto,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.findById(id);
    if (!article || article.userId !== req.userId) {
      throw new NotFoundException(`Article ${id} not found`);
    }

    const derivative = await this.derivativeRepo.create({
      articleId: id,
      userId: req.userId,
      kind: dto.kind,
    });

    await derivativeQueue.add(
      "generate-derivative",
      {
        derivativeId: derivative.id,
        articleId: id,
        userId: req.userId,
        kind: dto.kind,
      },
      // Deterministic id so the job can be cancelled when the derivative is
      // stopped/deleted.
      { jobId: derivative.id },
    );

    return { id: derivative.id, status: derivative.status };
  }

  @Get(":id/derivatives")
  async listDerivatives(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.findById(id);
    if (!article || article.userId !== req.userId) {
      throw new NotFoundException(`Article ${id} not found`);
    }
    return this.derivativeRepo.findByArticleId(id);
  }

  @Patch(":id/derivatives/:derivativeId")
  async editDerivative(
    @Param("id") id: string,
    @Param("derivativeId") derivativeId: string,
    @Body() dto: UpdateDerivativeDto,
    @Req() req: Request & { userId: string },
  ) {
    const derivative = await this.derivativeRepo.findById(derivativeId);
    if (
      !derivative ||
      derivative.articleId !== id ||
      derivative.userId !== req.userId
    ) {
      throw new NotFoundException(`Derivative ${derivativeId} not found`);
    }
    await this.derivativeRepo.updateEditable(derivativeId, dto.content);
    return { id: derivativeId, status: derivative.status };
  }

  @Delete(":id/derivatives/:derivativeId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDerivative(
    @Param("id") id: string,
    @Param("derivativeId") derivativeId: string,
    @Req() req: Request & { userId: string },
  ) {
    const derivative = await this.derivativeRepo.findById(derivativeId);
    if (
      !derivative ||
      derivative.articleId !== id ||
      derivative.userId !== req.userId
    ) {
      throw new NotFoundException(`Derivative ${derivativeId} not found`);
    }
    await this.derivativeRepo.delete(derivativeId);

    // Stop a queued/retrying job. Active jobs can't be removed, but their
    // writes become no-ops once the row is gone.
    try {
      const job = await derivativeQueue.getJob(derivativeId);
      if (job) await job.remove();
    } catch {
      // Best-effort; ignore if the job is currently locked by a worker.
    }
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ) {
    const article = await this.articleRepo.findById(id);
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    if (article.userId !== req.userId) {
      throw new ForbiddenException("Not your article");
    }
    await this.articleRepo.delete(id);
  }

  @Sse(":id/events")
  streamEvents(
    @Param("id") id: string,
    @Req() req: Request & { userId: string },
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    const unsubscribe = this.sseService.addClient(req.userId, (event) => {
      const articleId = (event as { articleId?: string }).articleId;
      if (articleId === id) {
        subject.next({ data: event } as MessageEvent);
      }
    });

    subject.next({
      data: { type: "connected", articleId: id, timestamp: Date.now() },
    } as MessageEvent);

    return new Observable((subscriber) => {
      const sub = subject.subscribe(subscriber);
      return () => {
        sub.unsubscribe();
        unsubscribe();
      };
    });
  }
}
