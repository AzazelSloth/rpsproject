import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyContext1710000000010 implements MigrationInterface {
  name = 'AddCompanyContext1710000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "context" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN IF EXISTS "context"
    `);
  }
}
