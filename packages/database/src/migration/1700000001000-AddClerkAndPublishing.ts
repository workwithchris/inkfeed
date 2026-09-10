import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class AddClerkAndPublishing1700000001000
  implements MigrationInterface
{
  name = "AddClerkAndPublishing1700000001000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "clerkUserId" varchar`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_clerkUserId" ON "users" ("clerkUserId") WHERE "clerkUserId" IS NOT NULL`,
    );

    await queryRunner.createTable(
      new Table({
        name: "connections",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "userId", type: "uuid" },
          { name: "platform", type: "varchar" },
          { name: "credentialEnc", type: "text" },
          { name: "blogId", type: "varchar", isNullable: true },
          { name: "blogName", type: "varchar", isNullable: true },
          { name: "createdAt", type: "timestamp", default: "now()" },
          { name: "updatedAt", type: "timestamp", default: "now()" },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: "publications",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "articleId", type: "uuid" },
          { name: "connectionId", type: "uuid" },
          { name: "userId", type: "uuid" },
          { name: "platform", type: "varchar" },
          { name: "status", type: "varchar", default: "'PENDING'" },
          { name: "externalId", type: "varchar", isNullable: true },
          { name: "externalUrl", type: "text", isNullable: true },
          { name: "errorMessage", type: "text", isNullable: true },
          { name: "createdAt", type: "timestamp", default: "now()" },
          { name: "updatedAt", type: "timestamp", default: "now()" },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "connections",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "publications",
      new TableForeignKey({
        columnNames: ["articleId"],
        referencedColumnNames: ["id"],
        referencedTableName: "articles",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "publications",
      new TableForeignKey({
        columnNames: ["connectionId"],
        referencedColumnNames: ["id"],
        referencedTableName: "connections",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_connections_userId" ON "connections" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_publications_articleId" ON "publications" ("articleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_publications_userId" ON "publications" ("userId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("publications");
    await queryRunner.dropTable("connections");
    await queryRunner.query(`DROP INDEX "IDX_users_clerkUserId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "clerkUserId"`);
  }
}
