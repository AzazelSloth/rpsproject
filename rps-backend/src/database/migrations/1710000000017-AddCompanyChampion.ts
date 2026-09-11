import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCompanyChampion1710000000017 implements MigrationInterface {
  name = 'AddCompanyChampion1710000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      ADD COLUMN IF NOT EXISTS "champion_name" varchar(150),
      ADD COLUMN IF NOT EXISTS "champion_email" varchar(254)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "companies"
      DROP COLUMN IF EXISTS "champion_email",
      DROP COLUMN IF EXISTS "champion_name"
    `);
  }
}
