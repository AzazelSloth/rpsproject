import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmployeeStatus1710000000006 implements MigrationInterface {
  name = 'AddEmployeeStatus1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD COLUMN IF NOT EXISTS "status" character varying(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN IF EXISTS "status"
    `);
  }
}
