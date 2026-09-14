import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { ArticleEntity } from "./ArticleEntity.js";

@Entity("users")
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", nullable: true })
  clerkUserId!: string | null;

  @Column({ unique: true })
  email!: string;

  // Public profile slug, e.g. "john" -> https://john.inkfeed.online
  @Index({ unique: true })
  @Column({ type: "varchar", nullable: true })
  username!: string | null;

  @Column({ type: "varchar", nullable: true })
  name!: string | null;

  // Profile image (from Clerk), used for public bylines.
  @Column({ type: "text", nullable: true })
  imageUrl!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ArticleEntity, (article) => article.user)
  articles!: ArticleEntity[];
}
