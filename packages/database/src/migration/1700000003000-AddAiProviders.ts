import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class AddAiProviders1700000003000 implements MigrationInterface {
  name = "AddAiProviders1700000003000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "ai_providers",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "userId", type: "uuid" },
          { name: "provider", type: "varchar" },
          { name: "model", type: "varchar" },
          { name: "label", type: "varchar", isNullable: true },
          { name: "baseUrl", type: "varchar", isNullable: true },
          { name: "apiKeyEnc", type: "text" },
          { name: "enabled", type: "boolean", default: true },
          { name: "priority", type: "int", default: 0 },
          { name: "createdAt", type: "timestamp", default: "now()" },
          { name: "updatedAt", type: "timestamp", default: "now()" },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "ai_providers",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_ai_providers_userId" ON "ai_providers" ("userId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("ai_providers");
  }
}
