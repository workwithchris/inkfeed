import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from "typeorm";

export class AddUserUsername1700000008000 implements MigrationInterface {
  name = "AddUserUsername1700000008000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "username",
        type: "varchar",
        isNullable: true,
      }),
    );
    await queryRunner.createIndex(
      "users",
      new TableIndex({
        name: "IDX_users_username",
        columnNames: ["username"],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("users", "IDX_users_username");
    await queryRunner.dropColumn("users", "username");
  }
}