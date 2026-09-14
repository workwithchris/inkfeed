import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from "typeorm";

export class AddUserImage1700000011000 implements MigrationInterface {
  name = "AddUserImage1700000011000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "imageUrl",
        type: "text",
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "imageUrl");
  }
}
