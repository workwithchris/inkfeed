import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from "typeorm";

export class AddPublicationResponse1700000005000 implements MigrationInterface {
  name = "AddPublicationResponse1700000005000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "publications",
      new TableColumn({
        name: "responseStatus",
        type: "int",
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      "publications",
      new TableColumn({
        name: "responseBody",
        type: "text",
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("publications", "responseBody");
    await queryRunner.dropColumn("publications", "responseStatus");
  }
}
