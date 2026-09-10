import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type PublishPlatform =
  | "devto"
  | "hashnode"
  | "blogger"
  | "linkedin"
  | "github";

export type PublishStatus =
  | "PENDING"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED";

@Entity("publications")
export class PublishEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  articleId!: string;

  @Column()
  connectionId!: string;

  @Index()
  @Column()
  userId!: string;

  @Column({ type: "varchar" })
  platform!: PublishPlatform;

  @Column({ type: "varchar", default: "PENDING" })
  status!: PublishStatus;

  @Column({ type: "varchar", nullable: true })
  externalId!: string | null;

  @Column({ type: "text", nullable: true })
  externalUrl!: string | null;

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
