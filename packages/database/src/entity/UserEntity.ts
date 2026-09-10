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

  @Column({ type: "varchar", nullable: true })
  name!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ArticleEntity, (article) => article.user)
  articles!: ArticleEntity[];
}
