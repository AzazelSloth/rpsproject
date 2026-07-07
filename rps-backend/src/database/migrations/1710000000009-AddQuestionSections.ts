import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuestionSections1710000000009 implements MigrationInterface {
  name = 'AddQuestionSections1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "question_sections" (
        "id" SERIAL NOT NULL,
        "campaign_id" integer NOT NULL,
        "title" character varying(150) NOT NULL,
        "description" text,
        "order_index" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_question_sections_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_question_sections_campaign_id'
        ) THEN
          ALTER TABLE "question_sections"
          ADD CONSTRAINT "FK_question_sections_campaign_id"
          FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "questions"
      ADD COLUMN IF NOT EXISTS "section_id" integer
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_questions_section_id'
        ) THEN
          ALTER TABLE "questions"
          ADD CONSTRAINT "FK_questions_section_id"
          FOREIGN KEY ("section_id") REFERENCES "question_sections"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_question_sections_campaign_order"
      ON "question_sections" ("campaign_id", "order_index")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_questions_section_order"
      ON "questions" ("section_id", "order_index")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_questions_section_order"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_question_sections_campaign_order"`);

    await queryRunner.query(`
      ALTER TABLE "questions" DROP CONSTRAINT IF EXISTS "FK_questions_section_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "questions" DROP COLUMN IF EXISTS "section_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "question_sections" DROP CONSTRAINT IF EXISTS "FK_question_sections_campaign_id"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "question_sections"`);
  }
}
