import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DerivativeEntity } from "@repo/database";
import type {
  Derivative,
  DerivativeKind,
  DerivativeRepository,
  DerivativeStatus,
} from "../../domain/index.js";

@Injectable()
export class TypeOrmDerivativeRepository implements DerivativeRepository {
  constructor(
    @InjectRepository(DerivativeEntity)
    private readonly repo: Repository<DerivativeEntity>,
  ) {}

  async create(data: {
    articleId: string;
    userId: string;
    kind: DerivativeKind;
  }): Promise<Derivative> {
    const entity = this.repo.create({
      articleId: data.articleId,
      userId: data.userId,
      kind: data.kind,
      status: "PENDING",
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Derivative | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByArticleId(articleId: string): Promise<Derivative[]> {
    const entities = await this.repo.find({
      where: { articleId },
      order: { createdAt: "DESC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async updateStatus(
    id: string,
    status: DerivativeStatus,
    errorMessage?: string | null,
  ): Promise<void> {
    await this.repo.update(id, { status, errorMessage: errorMessage ?? null });
  }

  async updateContent(
    id: string,
    data: { content: string; aiModel: string },
  ): Promise<void> {
    await this.repo.update(id, {
      content: data.content,
      aiModel: data.aiModel,
      status: "COMPLETED",
      errorMessage: null,
    });
  }

  async updateEditable(id: string, content: string): Promise<void> {
    await this.repo.update(id, { content });
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: DerivativeEntity): Derivative {
    return {
      id: entity.id,
      articleId: entity.articleId,
      userId: entity.userId,
      kind: entity.kind,
      status: entity.status,
      content: entity.content,
      aiModel: entity.aiModel,
      errorMessage: entity.errorMessage,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
