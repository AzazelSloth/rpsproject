import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCampaignIntroductionConclusion1710000000012
  implements MigrationInterface
{
  name = 'AddCampaignIntroductionConclusion1710000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaigns"
      ADD COLUMN IF NOT EXISTS "introduction_text" text,
      ADD COLUMN IF NOT EXISTS "conclusion_text" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaigns"
      DROP COLUMN IF EXISTS "conclusion_text",
      DROP COLUMN IF EXISTS "introduction_text"
    `);
  }
}
