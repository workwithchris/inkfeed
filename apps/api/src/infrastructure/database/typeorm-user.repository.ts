import { Injectable, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "@repo/database";
import type { User, UserRepository } from "../../domain/index.js";

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByClerkId(clerkUserId: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { clerkUserId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const entity = await this.repo.findOne({ where: { username } });
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

  async updateUsername(userId: string, username: string): Promise<User> {
    const normalized = normalizeUsername(username);
    const taken = await this.repo.findOne({
      where: { username: normalized },
    });
    if (taken && taken.id !== userId) {
      throw new ConflictException("Username is already taken");
    }
    await this.repo.update(userId, { username: normalized });
    const entity = await this.repo.findOne({ where: { id: userId } });
    if (!entity) throw new ConflictException("User not found");
    return this.toDomain(entity);
  }

  private toDomain(entity: UserEntity): User {
    return {
      id: entity.id,
      clerkUserId: entity.clerkUserId,
      email: entity.email,
      username: entity.username,
      name: entity.name,
    };
  }
}

// Lowercase, alphanumeric + hyphen, no leading/trailing hyphen.
function normalizeUsername(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!/^[a-z0-9][a-z0-9-]{2,31}$/.test(cleaned)) {
    throw new ConflictException(
      "Username must be 3-32 characters: letters, numbers, hyphens.",
    );
  }
  return cleaned;
}
