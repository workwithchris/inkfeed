import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCoverImage1700000002000 implements MigrationInterface {
  name = "AddCoverImage1700000002000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "articles",
      new TableColumn({ name: "coverImageUrl", type: "text", isNullable: true }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("articles", "coverImageUrl");
  }
}
