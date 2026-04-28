import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreEmployeeCompanyName1710000000005
  implements MigrationInterface
{
  name = 'RestoreEmployeeCompanyName1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD COLUMN IF NOT EXISTS "company_name" character varying(255)
    `);

    await queryRunner.query(`
      UPDATE "employees" AS "employee"
      SET "company_name" = "company"."name"
      FROM "companies" AS "company"
      WHERE "employee"."company_id" = "company"."id"
        AND (
          "employee"."company_name" IS NULL
          OR BTRIM("employee"."company_name") = ''
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN IF EXISTS "company_name"
    `);
  }
}
