import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

// A user-supplied (BYOK) AI provider. API keys are encrypted at rest.
@Entity("ai_providers")
export class ProviderEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  userId!: string;

  // Provider preset id understood by @ai-router/core (e.g. "openai", "groq").
  @Column({ type: "varchar" })
  provider!: string;

  // Provider-side model name, e.g. "gpt-4o-mini".
  @Column({ type: "varchar" })
  model!: string;

  @Column({ type: "varchar", nullable: true })
  label!: string | null;

  // Optional endpoint override; required for "openai-compatible".
  @Column({ type: "varchar", nullable: true })
  baseUrl!: string | null;

  // Encrypted at rest (AES-256-GCM). Never returned to clients.
  @Column({ type: "text" })
  apiKeyEnc!: string;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  // Fallback order; lower runs first.
  @Column({ type: "int", default: 0 })
  priority!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
