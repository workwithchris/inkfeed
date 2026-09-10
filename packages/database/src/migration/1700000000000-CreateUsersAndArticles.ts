import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class CreateUsersAndArticles1700000000000 implements MigrationInterface {
  name = "CreateUsersAndArticles1700000000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "email", type: "varchar", isUnique: true },
          { name: "name", type: "varchar", isNullable: true },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: "articles",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "userId", type: "uuid" },
          { name: "youtubeUrl", type: "varchar" },
          { name: "videoId", type: "varchar" },
          { name: "title", type: "varchar", default: "''" },
          { name: "content", type: "text", default: "''" },
          { name: "summary", type: "text", isNullable: true },
          { name: "status", type: "varchar", default: "'PENDING'" },
          { name: "transcript", type: "text", isNullable: true },
          { name: "durationSeconds", type: "int", isNullable: true },
          { name: "channel", type: "varchar", isNullable: true },
          { name: "aiModel", type: "varchar", isNullable: true },
          { name: "errorMessage", type: "text", isNullable: true },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "completedAt",
            type: "timestamp",
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "articles",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }) as unknown as import("typeorm").TableIndex,
    );

    // Create index manually
    await queryRunner.query(`CREATE INDEX "IDX_articles_userId" ON "articles" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_articles_status" ON "articles" ("status")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("articles");
    await queryRunner.dropTable("users");
  }
}
