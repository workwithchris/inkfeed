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
import { UserEntity } from "./UserEntity.js";

export type JobStatus =
  | "PENDING"
  | "EXTRACTING"
  | "SYNTHESIZING"
  | "COMPLETED"
  | "FAILED";

@Entity("articles")
export class ArticleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => UserEntity, (user) => user.articles)
  @JoinColumn({ name: "userId" })
  user!: UserEntity;

  @Column()
  youtubeUrl!: string;

  @Column()
  videoId!: string;

  // Where the source content came from: "youtube" | "url" | "document" | "feed".
  @Column({ type: "varchar", default: "youtube" })
  sourceType!: string;

  @Column({ type: "text", nullable: true })
  sourceUrl!: string | null;

  // For "feed" sources: the selected episode/item URL.
  @Column({ type: "text", nullable: true })
  sourceItemUrl!: string | null;

  @Column({ default: "" })
  title!: string;

  @Column({ type: "text", default: "" })
  content!: string;

  @Column({ type: "text", nullable: true })
  summary!: string | null;

  @Column({ type: "varchar", nullable: true })
  metaTitle!: string | null;

  @Column({ type: "text", nullable: true })
  metaDescription!: string | null;

  @Column({ type: "varchar", nullable: true })
  slug!: string | null;

  @Column({ type: "simple-array", nullable: true })
  keywords!: string[] | null;

  @Column({ type: "simple-array", nullable: true })
  tags!: string[] | null;

  @Column({ type: "int", nullable: true })
  readingTimeMinutes!: number | null;

  @Column({ type: "text", nullable: true })
  coverImageUrl!: string | null;

  // Public page views. Incremented when a published article is read.
  @Column({ type: "int", default: 0 })
  viewCount!: number;

  @Column({ type: "varchar", default: "PENDING" })
  status!: JobStatus;

  @Column({ type: "text", nullable: true })
  transcript!: string | null;

  @Column({ type: "int", nullable: true })
  durationSeconds!: number | null;

  @Column({ type: "varchar", nullable: true })
  channel!: string | null;

  @Column({ type: "varchar", nullable: true })
  aiModel!: string | null;

  // Whether generation used the user's own provider ("user") or the
  // server/env default ("platform").
  @Column({ type: "varchar", nullable: true })
  aiSource!: "user" | "platform" | null;

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt!: Date | null;
}
