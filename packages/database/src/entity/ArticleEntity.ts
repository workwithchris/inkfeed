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

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  completedAt!: Date | null;
}
