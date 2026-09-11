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
  | "github"
  | "site"
  | "webhook";

@Entity("connections")
export class ConnectionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @Column({ type: "varchar" })
  platform!: PublishPlatform;

  // Encrypted at rest (AES-256-GCM). Never returned to clients.
  @Column({ type: "text" })
  credentialEnc!: string;

  @Column({ type: "varchar", nullable: true })
  blogId!: string | null;

  @Column({ type: "varchar", nullable: true })
  blogName!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
