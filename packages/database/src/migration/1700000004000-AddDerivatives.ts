import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class AddDerivatives1700000004000 implements MigrationInterface {
  name = "AddDerivatives1700000004000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "derivatives",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "articleId", type: "uuid" },
          { name: "userId", type: "uuid" },
          { name: "kind", type: "varchar" },
          { name: "status", type: "varchar", default: "'PENDING'" },
          { name: "content", type: "text", isNullable: true },
          { name: "aiModel", type: "varchar", isNullable: true },
          { name: "errorMessage", type: "text", isNullable: true },
          { name: "createdAt", type: "timestamp", default: "now()" },
          { name: "updatedAt", type: "timestamp", default: "now()" },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      "derivatives",
      new TableForeignKey({
        columnNames: ["articleId"],
        referencedColumnNames: ["id"],
        referencedTableName: "articles",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.createForeignKey(
      "derivatives",
      new TableForeignKey({
        columnNames: ["userId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      }),
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_derivatives_articleId" ON "derivatives" ("articleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_derivatives_userId" ON "derivatives" ("userId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("derivatives");
  }
}
