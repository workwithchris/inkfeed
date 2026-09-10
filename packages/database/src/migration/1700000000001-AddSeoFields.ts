import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSeoFields1700000000001 implements MigrationInterface {
  name = "AddSeoFields1700000000001";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("articles", [
      new TableColumn({ name: "metaTitle", type: "varchar", isNullable: true }),
      new TableColumn({ name: "metaDescription", type: "text", isNullable: true }),
      new TableColumn({ name: "slug", type: "varchar", isNullable: true }),
      new TableColumn({ name: "keywords", type: "text", isNullable: true }),
      new TableColumn({ name: "tags", type: "text", isNullable: true }),
      new TableColumn({ name: "readingTimeMinutes", type: "int", isNullable: true }),
    ]);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns("articles", [
      "metaTitle",
      "metaDescription",
      "slug",
      "keywords",
      "tags",
      "readingTimeMinutes",
    ]);
  }
}
