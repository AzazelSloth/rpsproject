import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "name" character varying,
        "email" character varying,
        "password" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "companies" (
        "id" SERIAL NOT NULL,
        "name" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_companies_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "campaigns" (
        "id" SERIAL NOT NULL,
        "company_id" integer NOT NULL,
        "name" character varying,
        "start_date" date,
        "end_date" date,
        "status" character varying DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_campaigns_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "employees" (
        "id" SERIAL NOT NULL,
        "company_id" integer NOT NULL,
        "first_name" character varying,
        "last_name" character varying,
        "email" character varying,
        "phone" character varying,
        "department" character varying,
        "survey_token" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_employees_email" UNIQUE ("email"),
        CONSTRAINT "UQ_employees_survey_token" UNIQUE ("survey_token"),
        CONSTRAINT "PK_employees_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "questions" (
        "id" SERIAL NOT NULL,
        "campaign_id" integer NOT NULL,
        "question_text" text,
        "question_type" character varying,
        "rps_dimension" character varying,
        "order_index" integer NOT NULL DEFAULT 0,
        "choice_options" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_questions_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "reports" (
        "id" SERIAL NOT NULL,
        "campaign_id" integer NOT NULL,
        "report_path" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_reports_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "responses" (
        "id" SERIAL NOT NULL,
        "employee_id" integer NOT NULL,
        "question_id" integer NOT NULL,
        "answer" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_responses_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "campaign_participants" (
        "id" SERIAL NOT NULL,
        "campaign_id" integer NOT NULL,
        "employee_id" integer NOT NULL,
        "participation_token" character varying,
        "status" character varying NOT NULL DEFAULT 'pending',
        "invitation_sent_at" TIMESTAMP,
        "reminder_sent_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_campaign_participants_token" UNIQUE ("participation_token"),
        CONSTRAINT "UQ_campaign_participants_campaign_employee" UNIQUE ("campaign_id", "employee_id"),
        CONSTRAINT "PK_campaign_participants_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "campaigns"
      ADD CONSTRAINT "FK_campaigns_company_id"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "employees"
      ADD CONSTRAINT "FK_employees_company_id"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "questions"
      ADD CONSTRAINT "FK_questions_campaign_id"
      FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "reports"
      ADD CONSTRAINT "FK_reports_campaign_id"
      FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "responses"
      ADD CONSTRAINT "FK_responses_employee_id"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "responses"
      ADD CONSTRAINT "FK_responses_question_id"
      FOREIGN KEY ("question_id") REFERENCES "questions"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "campaign_participants"
      ADD CONSTRAINT "FK_campaign_participants_campaign_id"
      FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "campaign_participants"
      ADD CONSTRAINT "FK_campaign_participants_employee_id"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "campaign_participants" DROP CONSTRAINT "FK_campaign_participants_employee_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "campaign_participants" DROP CONSTRAINT "FK_campaign_participants_campaign_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "responses" DROP CONSTRAINT "FK_responses_question_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "responses" DROP CONSTRAINT "FK_responses_employee_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "reports" DROP CONSTRAINT "FK_reports_campaign_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "questions" DROP CONSTRAINT "FK_questions_campaign_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "employees" DROP CONSTRAINT "FK_employees_company_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "campaigns" DROP CONSTRAINT "FK_campaigns_company_id"
    `);

    await queryRunner.query(`DROP TABLE "campaign_participants"`);
    await queryRunner.query(`DROP TABLE "responses"`);
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TABLE "questions"`);
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(`DROP TABLE "campaigns"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
