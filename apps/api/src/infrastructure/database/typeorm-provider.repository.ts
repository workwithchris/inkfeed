import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProviderEntity } from "@repo/database";
import type {
  AiProvider,
  AiProviderId,
  AiProviderRepository,
} from "../../domain/index.js";

@Injectable()
export class TypeOrmProviderRepository implements AiProviderRepository {
  constructor(
    @InjectRepository(ProviderEntity)
    private readonly repo: Repository<ProviderEntity>,
  ) {}

  async create(data: {
    userId: string;
    provider: AiProviderId;
    model: string;
    label: string | null;
    baseUrl: string | null;
    apiKeyEnc: string;
    priority: number;
  }): Promise<AiProvider> {
    const saved = await this.repo.save(this.repo.create(data));
    return this.toDomain(saved);
  }

  async findById(
    id: string,
  ): Promise<(AiProvider & { apiKeyEnc: string }) | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return { ...this.toDomain(entity), apiKeyEnc: entity.apiKeyEnc };
  }

  async findEnabledByUserId(
    userId: string,
  ): Promise<(AiProvider & { apiKeyEnc: string })[]> {
    const entities = await this.repo.find({
      where: { userId, enabled: true },
      order: { priority: "ASC", createdAt: "ASC" },
    });
    return entities.map((e) => ({
      ...this.toDomain(e),
      apiKeyEnc: e.apiKeyEnc,
    }));
  }

  async findByUserId(userId: string): Promise<AiProvider[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { priority: "ASC", createdAt: "ASC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async update(
    id: string,
    data: {
      label?: string | null;
      model?: string;
      enabled?: boolean;
      priority?: number;
    },
  ): Promise<AiProvider> {
    await this.repo.update(id, data);
    const entity = await this.repo.findOneOrFail({ where: { id } });
    return this.toDomain(entity);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: ProviderEntity): AiProvider {
    return {
      id: entity.id,
      userId: entity.userId,
      provider: entity.provider as AiProviderId,
      model: entity.model,
      label: entity.label,
      baseUrl: entity.baseUrl,
      enabled: entity.enabled,
      priority: entity.priority,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
