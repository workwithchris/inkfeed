import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from "typeorm";

export class AddArticleVideo1700000012000 implements MigrationInterface {
  name = "AddArticleVideo1700000012000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "articles",
      new TableColumn({ name: "videoUrl", type: "text", isNullable: true }),
    );
    await queryRunner.addColumn(
      "articles",
      new TableColumn({ name: "videoStatus", type: "varchar", isNullable: true }),
    );
    await queryRunner.addColumn(
      "articles",
      new TableColumn({ name: "videoError", type: "text", isNullable: true }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("articles", "videoError");
    await queryRunner.dropColumn("articles", "videoStatus");
    await queryRunner.dropColumn("articles", "videoUrl");
  }
}
