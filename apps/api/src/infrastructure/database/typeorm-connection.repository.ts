import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConnectionEntity } from "@repo/database";
import type {
  Connection,
  ConnectionRepository,
  PublishPlatform,
} from "../../domain/index";

@Injectable()
export class TypeOrmConnectionRepository implements ConnectionRepository {
  constructor(
    @InjectRepository(ConnectionEntity)
    private readonly repo: Repository<ConnectionEntity>,
  ) {}

  async create(data: {
    userId: string;
    platform: PublishPlatform;
    credentialEnc: string;
    blogId: string | null;
    blogName: string | null;
  }): Promise<Connection> {
    const saved = await this.repo.save(this.repo.create(data));
    return this.toDomain(saved);
  }

  async findById(
    id: string,
  ): Promise<(Connection & { credentialEnc: string }) | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return { ...this.toDomain(entity), credentialEnc: entity.credentialEnc };
  }

  async findByUserId(userId: string): Promise<Connection[]> {
    const entities = await this.repo.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  private toDomain(entity: ConnectionEntity): Connection {
    return {
      id: entity.id,
      userId: entity.userId,
      platform: entity.platform,
      blogId: entity.blogId,
      blogName: entity.blogName,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
