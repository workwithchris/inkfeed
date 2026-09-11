import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from "typeorm";

export class AddAiSource1700000006000 implements MigrationInterface {
  name = "AddAiSource1700000006000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "articles",
      new TableColumn({
        name: "aiSource",
        type: "varchar",
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("articles", "aiSource");
  }
}
