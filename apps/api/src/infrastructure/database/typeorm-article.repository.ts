import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ArticleEntity } from "@repo/database";
import type {
  ArticleRepository,
  CreateArticleData,
  TranscriptData,
  ContentData,
  EditableContentData,
  Article,
} from "../../domain/index";

@Injectable()
export class TypeOrmArticleRepository implements ArticleRepository {
  constructor(
    @InjectRepository(ArticleEntity)
    private readonly repo: Repository<ArticleEntity>,
  ) {}

  async create(data: CreateArticleData): Promise<Article> {
    const entity = this.repo.create({
      userId: data.userId,
      youtubeUrl: data.youtubeUrl,
      videoId: data.videoId,
      title: data.title ?? "",
      channel: data.channel ?? null,
      status: "PENDING",
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Article | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findBySlug(slug: string): Promise<Article | null> {
    const entity = await this.repo.findOne({ where: { slug } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Article[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
    return entities.map(this.toDomain);
  }

  async updateStatus(id: string, status: Article["status"]): Promise<void> {
    await this.repo.update(id, { status });
  }

  async updateTranscript(id: string, data: TranscriptData): Promise<void> {
    await this.repo.update(id, {
      title: data.title,
      transcript: data.transcript,
      durationSeconds: data.durationSeconds,
      channel: data.channel,
    });
  }

  async updateContent(id: string, data: ContentData): Promise<void> {
    await this.repo.update(id, {
      content: data.content,
      summary: data.summary,
      aiModel: data.aiModel,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      slug: data.slug,
      keywords: data.keywords,
      tags: data.tags,
      readingTimeMinutes: data.readingTimeMinutes,
      coverImageUrl: data.coverImageUrl,
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.repo.update(id, {
      status: "FAILED",
      errorMessage: error,
    });
  }

  async markCompleted(id: string): Promise<void> {
    await this.repo.update(id, {
      status: "COMPLETED",
      completedAt: new Date(),
    });
  }

  async updateEditable(id: string, data: EditableContentData): Promise<void> {
    const patch: Partial<ArticleEntity> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.content !== undefined) patch.content = data.content;
    if (data.metaTitle !== undefined) patch.metaTitle = data.metaTitle;
    if (data.metaDescription !== undefined)
      patch.metaDescription = data.metaDescription;
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.keywords !== undefined) patch.keywords = data.keywords;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (data.coverImageUrl !== undefined) patch.coverImageUrl = data.coverImageUrl;
    if (Object.keys(patch).length === 0) return;
    await this.repo.update(id, patch);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: ArticleEntity): Article {
    return {
      id: entity.id,
      userId: entity.userId,
      youtubeUrl: entity.youtubeUrl,
      videoId: entity.videoId,
      title: entity.title,
      content: entity.content,
      summary: entity.summary,
      metaTitle: entity.metaTitle,
      metaDescription: entity.metaDescription,
      slug: entity.slug,
      keywords: entity.keywords,
      tags: entity.tags,
      readingTimeMinutes: entity.readingTimeMinutes,
      coverImageUrl: entity.coverImageUrl,
      status: entity.status,
      transcript: entity.transcript,
      durationSeconds: entity.durationSeconds,
      channel: entity.channel,
      aiModel: entity.aiModel,
      errorMessage: entity.errorMessage,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      completedAt: entity.completedAt,
    };
  }
}
