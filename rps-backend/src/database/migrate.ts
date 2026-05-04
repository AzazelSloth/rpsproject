import AppDataSource from './data-source';
import bcryptModule from 'bcrypt';
import { getBootstrapAdminEmails } from '../auth/admin-access.config';
import { User } from '../auth/user.entity';

const INITIAL_MIGRATION_NAME = 'InitialSchema1710000000000';
const INITIAL_MIGRATION_TIMESTAMP = 1710000000000;
const bcrypt = bcryptModule as unknown as {
  hash(data: string, saltOrRounds: number): Promise<string>;
};

function asBoolean(value: unknown): boolean {
  return value === true || value === 't' || value === 'true' || value === 1;
}

function readExistsValue(rows: unknown): unknown {
  if (!Array.isArray(rows) || rows.length === 0) {
    return undefined;
  }

  const firstRow: unknown = rows[0];
  if (!firstRow || typeof firstRow !== 'object' || !('exists' in firstRow)) {
    return undefined;
  }

  return (firstRow as { exists?: unknown }).exists;
}

async function ensureMigrationBaselineForLegacySchema() {
  const legacySchemaRows: unknown = await AppDataSource.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('companies', 'campaigns', 'employees')
      ) AS "exists"
    `,
  );

  const hasLegacySchema = asBoolean(readExistsValue(legacySchemaRows));
  if (!hasLegacySchema) {
    return;
  }

  await AppDataSource.query(`
    CREATE TABLE IF NOT EXISTS "migrations" (
      "id" SERIAL NOT NULL,
      "timestamp" bigint NOT NULL,
      "name" character varying NOT NULL,
      CONSTRAINT "PK_migrations_id" PRIMARY KEY ("id")
    )
  `);

  const initialRecordedRows: unknown = await AppDataSource.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM "migrations"
        WHERE "name" = $1
      ) AS "exists"
    `,
    [INITIAL_MIGRATION_NAME],
  );

  const initialRecorded = asBoolean(readExistsValue(initialRecordedRows));
  if (initialRecorded) {
    return;
  }

  await AppDataSource.query(
    `
      INSERT INTO "migrations" ("timestamp", "name")
      VALUES ($1, $2)
    `,
    [INITIAL_MIGRATION_TIMESTAMP, INITIAL_MIGRATION_NAME],
  );

  console.log(
    `[db] Baseline applied for existing schema with migration ${INITIAL_MIGRATION_NAME}.`,
  );
}

async function ensureBootstrapAdmins() {
  const bootstrapPassword =
    process.env.ADMIN_BOOTSTRAP_PASSWORD?.trim() || 'password';
  const bootstrapEmails = getBootstrapAdminEmails();
  const userRepository = AppDataSource.getRepository(User);

  for (const email of bootstrapEmails) {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(bootstrapPassword, 10);
      const name = normalizedEmail.startsWith('isabelle')
        ? 'Isabelle'
        : 'Roxanne';

      await userRepository.save(
        userRepository.create({
          name,
          email: normalizedEmail,
          password: passwordHash,
        }),
      );
      console.log(`[db] Bootstrap admin created: ${normalizedEmail}`);
      continue;
    }

    if (!existingUser.password) {
      existingUser.password = await bcrypt.hash(bootstrapPassword, 10);
      await userRepository.save(existingUser);
      console.log(
        `[db] Bootstrap admin password initialized: ${normalizedEmail}`,
      );
    }
  }
}

async function runMigrations() {
  await AppDataSource.initialize();

  try {
    await ensureMigrationBaselineForLegacySchema();
    const executed = await AppDataSource.runMigrations({ transaction: 'all' });
    await ensureBootstrapAdmins();

    if (executed.length === 0) {
      console.log('[db] No pending migration.');
      return;
    }

    console.log(`[db] Applied ${executed.length} migration(s):`);
    for (const migration of executed) {
      console.log(`- ${migration.name}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

void runMigrations().catch((error: unknown) => {
  const message =
    error instanceof Error ? (error.stack ?? error.message) : error;
  console.error('[db] Migration failed:', message);
  process.exit(1);
});
