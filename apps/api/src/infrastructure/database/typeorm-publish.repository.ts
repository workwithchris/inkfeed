import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PublishEntity } from "@repo/database";
import type {
  Publication,
  PublishRepository,
  PublishPlatform,
  PublishStatus,
} from "../../domain/index";

@Injectable()
export class TypeOrmPublishRepository implements PublishRepository {
  constructor(
    @InjectRepository(PublishEntity)
    private readonly repo: Repository<PublishEntity>,
  ) {}

  async create(data: {
    articleId: string;
    connectionId: string;
    userId: string;
    platform: PublishPlatform;
  }): Promise<Publication> {
    const saved = await this.repo.save(
      this.repo.create({ ...data, status: "PENDING" }),
    );
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Publication | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByArticleId(articleId: string): Promise<Publication[]> {
    const entities = await this.repo.find({
      where: { articleId },
      order: { createdAt: "DESC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByUserId(userId: string): Promise<Publication[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async updateStatus(
    id: string,
    data: {
      status: PublishStatus;
      externalId?: string | null;
      externalUrl?: string | null;
      errorMessage?: string | null;
      responseStatus?: number | null;
      responseBody?: string | null;
    },
  ): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: PublishEntity): Publication {
    return {
      id: entity.id,
      articleId: entity.articleId,
      connectionId: entity.connectionId,
      userId: entity.userId,
      platform: entity.platform,
      status: entity.status,
      externalId: entity.externalId,
      externalUrl: entity.externalUrl,
      errorMessage: entity.errorMessage,
      responseStatus: entity.responseStatus,
      responseBody: entity.responseBody,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
