import { MigrationInterface, QueryRunner } from 'typeorm';

export class CaptureSurveySubmissions1710000000016
  implements MigrationInterface
{
  name = 'CaptureSurveySubmissions1710000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaign_participants"
      ADD COLUMN IF NOT EXISTS "questionnaire_snapshot" jsonb
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "survey_submission_items" (
        "id" SERIAL NOT NULL,
        "participation_id" integer NOT NULL,
        "original_question_id" integer,
        "question_text" text,
        "question_type" character varying,
        "section_title" character varying(150),
        "section_order" integer,
        "question_order" integer NOT NULL,
        "choice_options" jsonb,
        "answer" text,
        "response_state" character varying(20) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_survey_submission_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_survey_submission_items_response_state"
          CHECK ("response_state" IN ('answered', 'declined', 'skipped')),
        CONSTRAINT "CHK_survey_submission_items_answer_consistency"
          CHECK (
            (
              "response_state" = 'answered'
              AND "answer" IS NOT NULL
              AND btrim("answer") <> ''
            ) OR (
              "response_state" IN ('declined', 'skipped')
              AND "answer" IS NULL
            )
          ),
        CONSTRAINT "FK_survey_submission_items_participation_id"
          FOREIGN KEY ("participation_id")
          REFERENCES "campaign_participants"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
        "IDX_survey_submission_items_participation_question"
      ON "survey_submission_items" ("participation_id", "original_question_id")
      WHERE "original_question_id" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "survey_submission_items"`);
    await queryRunner.query(`
      ALTER TABLE "campaign_participants"
      DROP COLUMN IF EXISTS "questionnaire_snapshot"
    `);
  }
}
