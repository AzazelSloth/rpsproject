import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingConstraints1710000000003
  implements MigrationInterface
{
  name = 'AddMissingConstraints1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "responses"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP NULL
    `);

    await queryRunner.query(`
      UPDATE "campaigns"
      SET "end_date" = "start_date"
      WHERE "start_date" IS NOT NULL
        AND "end_date" IS NOT NULL
        AND "end_date" < "start_date"
    `);

    await queryRunner.query(`
      WITH ranked_responses AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (
            PARTITION BY "employee_id", "question_id"
            ORDER BY "created_at" DESC, "id" DESC
          ) AS "row_num"
        FROM "responses"
        WHERE "deleted_at" IS NULL
      )
      UPDATE "responses" AS "response"
      SET "deleted_at" = NOW()
      FROM ranked_responses
      WHERE "response"."id" = ranked_responses."id"
        AND ranked_responses."row_num" > 1
        AND "response"."deleted_at" IS NULL
    `);

    const employees: Array<{ id: number; survey_token: string | null }> =
      await queryRunner.query(`
        SELECT "id", "survey_token"
        FROM "employees"
        ORDER BY "id" ASC
      `);

    const seenTokens = new Set<string>();

    for (const employee of employees) {
      const currentToken = employee.survey_token?.trim() || null;
      const shouldReplace =
        !currentToken || seenTokens.has(currentToken.toLowerCase());

      if (!shouldReplace) {
        seenTokens.add(currentToken.toLowerCase());
        continue;
      }

      let nextToken = randomUUID();
      while (seenTokens.has(nextToken.toLowerCase())) {
        nextToken = randomUUID();
      }

      await queryRunner.query(
        `
          UPDATE "employees"
          SET "survey_token" = $1
          WHERE "id" = $2
        `,
        [nextToken, employee.id],
      );

      seenTokens.add(nextToken.toLowerCase());
    }

    await queryRunner.query(`
      ALTER TABLE "responses"
      DROP CONSTRAINT IF EXISTS "UQ_responses_employee_question"
    `);

    await queryRunner.query(`
      ALTER TABLE "campaigns"
      DROP CONSTRAINT IF EXISTS "CHK_campaign_dates"
    `);

    await queryRunner.query(`
      ALTER TABLE "campaigns"
      ADD CONSTRAINT "CHK_campaign_dates"
      CHECK (
        "start_date" IS NULL
        OR "end_date" IS NULL
        OR "end_date" >= "start_date"
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_employees_deleted_at"
      ON "employees" ("deleted_at")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_responses_deleted_at"
      ON "responses" ("deleted_at")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_responses_employee_question_active"
      ON "responses" ("employee_id", "question_id")
      WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_campaign_participants_token"
      ON "campaign_participants" ("participation_token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_campaign_participants_token"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_responses_employee_question_active"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_responses_deleted_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_employees_deleted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "campaigns"
      DROP CONSTRAINT IF EXISTS "CHK_campaign_dates"
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      DROP COLUMN IF EXISTS "deleted_at"
    `);

    await queryRunner.query(`
      ALTER TABLE "responses"
      DROP COLUMN IF EXISTS "deleted_at"
    `);
  }
}
