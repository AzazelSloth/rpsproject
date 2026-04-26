import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveRedundantEmployeeCompanyName1710000000004
  implements MigrationInterface
{
  name = 'RemoveRedundantEmployeeCompanyName1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN IF EXISTS "company_name"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD COLUMN IF NOT EXISTS "company_name" character varying(255)
    `);
  }
}
