import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyNameToEmployee1710000000002 implements MigrationInterface {
  name = 'AddCompanyNameToEmployee1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD COLUMN IF NOT EXISTS "company_name" character varying(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN IF EXISTS "company_name"
    `);
  }
}
