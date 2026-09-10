import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ArticleEntity } from "./ArticleEntity.js";

export type DerivativeKind = "tweet_thread" | "newsletter" | "video_script";

export type DerivativeStatus =
  | "PENDING"
  | "SYNTHESIZING"
  | "COMPLETED"
  | "FAILED";

@Entity("derivatives")
export class DerivativeEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  articleId!: string;

  @ManyToOne(() => ArticleEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "articleId" })
  article!: ArticleEntity;

  @Index()
  @Column()
  userId!: string;

  @Column({ type: "varchar" })
  kind!: DerivativeKind;

  @Column({ type: "varchar", default: "PENDING" })
  status!: DerivativeStatus;

  @Column({ type: "text", nullable: true })
  content!: string | null;

  @Column({ type: "varchar", nullable: true })
  aiModel!: string | null;

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
