import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from "typeorm";

export class AddSourceFields1700000007000 implements MigrationInterface {
  name = "AddSourceFields1700000007000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "articles",
      new TableColumn({
        name: "sourceType",
        type: "varchar",
        default: "'youtube'",
      }),
    );

    await queryRunner.addColumn(
      "articles",
      new TableColumn({
        name: "sourceUrl",
        type: "text",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "articles",
      new TableColumn({
        name: "sourceItemUrl",
        type: "text",
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("articles", "sourceItemUrl");
    await queryRunner.dropColumn("articles", "sourceUrl");
    await queryRunner.dropColumn("articles", "sourceType");
  }
}
