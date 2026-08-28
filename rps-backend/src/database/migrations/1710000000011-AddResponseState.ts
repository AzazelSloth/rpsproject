import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResponseState1710000000011 implements MigrationInterface {
  name = 'AddResponseState1710000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "responses"
      ADD COLUMN IF NOT EXISTS "response_state" varchar(20) NOT NULL DEFAULT 'answered'
    `);
    await queryRunner.query(`
      UPDATE "responses"
      SET "response_state" = 'declined', "answer" = NULL
      WHERE LOWER(TRIM(COALESCE("answer", ''))) = LOWER('Je préfère ne pas répondre')
    `);
    await queryRunner.query(`
      ALTER TABLE "responses"
      DROP CONSTRAINT IF EXISTS "CHK_responses_response_state"
    `);
    await queryRunner.query(`
      ALTER TABLE "responses"
      ADD CONSTRAINT "CHK_responses_response_state"
      CHECK ("response_state" IN ('answered', 'declined'))
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "responses"
      SET "answer" = 'Je préfère ne pas répondre'
      WHERE "response_state" = 'declined'
    `);
    await queryRunner.query(`
      ALTER TABLE "responses"
      DROP CONSTRAINT IF EXISTS "CHK_responses_response_state"
    `);
    await queryRunner.query(`
      ALTER TABLE "responses"
      DROP COLUMN IF EXISTS "response_state"
    `);
  }
}
