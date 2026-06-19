import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetToUsers1710000000008
  implements MigrationInterface
{
  name = 'AddPasswordResetToUsers1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "password_reset_token_hash" character varying,
      ADD COLUMN "password_reset_expires_at" TIMESTAMP
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_password_reset_token_hash"
      ON "users" ("password_reset_token_hash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_users_password_reset_token_hash"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "password_reset_expires_at",
      DROP COLUMN "password_reset_token_hash"
    `);
  }
}
