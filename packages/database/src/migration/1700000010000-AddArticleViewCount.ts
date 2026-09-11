import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddArticleViewCount1700000010000 implements MigrationInterface {
  name = "AddArticleViewCount1700000010000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "articles",
      new TableColumn({
        name: "viewCount",
        type: "int",
        default: 0,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("articles", "viewCount");
  }
}
