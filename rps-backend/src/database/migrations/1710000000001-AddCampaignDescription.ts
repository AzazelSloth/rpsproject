import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCampaignDescription1710000000001 implements MigrationInterface {
  name = 'AddCampaignDescription1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaigns"
      ADD COLUMN "description" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaigns"
      DROP COLUMN "description"
    `);
  }
}
