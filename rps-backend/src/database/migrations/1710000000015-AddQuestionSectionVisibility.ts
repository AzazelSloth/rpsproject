import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionSectionVisibility1710000000015 implements MigrationInterface {
  name = 'AddQuestionSectionVisibility1710000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "question_sections"
      ADD COLUMN IF NOT EXISTS "is_visible" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "question_sections" DROP COLUMN IF EXISTS "is_visible"
    `);
  }
}
