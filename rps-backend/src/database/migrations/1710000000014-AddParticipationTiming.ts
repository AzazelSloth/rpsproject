import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParticipationTiming1710000000014 implements MigrationInterface {
  name = 'AddParticipationTiming1710000000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaign_participants"
      ADD COLUMN "timing_started_at" timestamptz,
      ADD COLUMN "timing_intervals" jsonb NOT NULL DEFAULT '[]'::jsonb`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "campaign_participants"
      DROP COLUMN "timing_intervals", DROP COLUMN "timing_started_at"`);
  }
}
