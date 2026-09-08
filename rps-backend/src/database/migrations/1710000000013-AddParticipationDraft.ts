import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParticipationDraft1710000000013 implements MigrationInterface {
  name = 'AddParticipationDraft1710000000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaign_participants"
      ADD COLUMN "draft" jsonb,
      ADD COLUMN "draft_revision" integer NOT NULL DEFAULT 0`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "campaign_participants" SET "status" =
      CASE WHEN "reminder_sent_at" IS NULL THEN 'pending' ELSE 'reminded' END
      WHERE "status" = 'in_progress'`);
    await queryRunner.query(`ALTER TABLE "campaign_participants"
      DROP COLUMN "draft_revision", DROP COLUMN "draft"`);
  }
}
