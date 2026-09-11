import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddScheduledPublish1700000009000 implements MigrationInterface {
  name = "AddScheduledPublish1700000009000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "publications",
      new TableColumn({
        name: "scheduledFor",
        type: "timestamptz",
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("publications", "scheduledFor");
  }
}
