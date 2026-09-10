import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "@repo/database";
import type { User, UserRepository } from "../../domain/index";

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findByClerkId(clerkUserId: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { clerkUserId } });
    return entity ? this.toDomain(entity) : null;
  }

  async upsertFromClerk(data: {
    clerkUserId: string;
    email: string;
    name: string | null;
  }): Promise<User> {
    // Attach to an existing row by email if present (pre-Clerk users).
    const existing = await this.repo.findOne({ where: { email: data.email } });
    if (existing) {
      existing.clerkUserId = data.clerkUserId;
      if (data.name) existing.name = data.name;
      const saved = await this.repo.save(existing);
      return this.toDomain(saved);
    }

    const entity = this.repo.create({
      clerkUserId: data.clerkUserId,
      email: data.email,
      name: data.name,
    });
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: UserEntity): User {
    return {
      id: entity.id,
      clerkUserId: entity.clerkUserId,
      email: entity.email,
      name: entity.name,
    };
  }
}
