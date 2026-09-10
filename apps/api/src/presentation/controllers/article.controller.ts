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
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { CreateArticleDto } from "../../application/dtos/create-article.dto";
import {
  UpdateArticleDto,
  PublishArticleDto,
} from "../../application/dtos/connection.dto";
import { GetArticleQuery, ListArticlesQuery } from "../../application/queries/get-article.query";
import { UpdateArticleUseCase } from "../../application/commands/update-article.command";
import type {
  ArticleRepository,
  ConnectionRepository,
  PublishRepository,
} from "../../domain/index";
import { SseService } from "../sse/sse.service";
import { ClerkAuthGuard } from "../../infrastructure/auth/clerk-auth.guard";
import { articleQueue, publishQueue } from "@repo/queue";
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
    private readonly sseService: SseService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateArticleDto,
    @Req() req: Request & { userId: string },
  ) {
    const videoIdMatch = dto.youtubeUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    const videoId = videoIdMatch?.[1] ?? "";

    const metadata = await fetchYouTubeMetadata(dto.youtubeUrl);

    const article = await this.articleRepo.create({
      userId: req.userId,
      youtubeUrl: dto.youtubeUrl,
      videoId,
      title: metadata.title,
      channel: metadata.channel,
    });

    await articleQueue.add("process-article", {
      articleId: article.id,
      youtubeUrl: dto.youtubeUrl,
      videoId,
      userId: req.userId,
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

    const publication = await this.publishRepo.create({
      articleId: id,
      connectionId: dto.connectionId,
      userId: req.userId,
      platform: connection.platform,
    });

    await publishQueue.add("publish-article", {
      publicationId: publication.id,
      articleId: id,
      connectionId: dto.connectionId,
      userId: req.userId,
      includeCoverImage: dto.includeCoverImage ?? true,
      title: dto.title,
      coverImageUrl: dto.coverImageUrl,
    });

    return { publicationId: publication.id, status: publication.status };
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
