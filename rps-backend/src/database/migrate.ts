import AppDataSource from './data-source';

const INITIAL_MIGRATION_NAME = 'InitialSchema1710000000000';
const INITIAL_MIGRATION_TIMESTAMP = 1710000000000;

function asBoolean(value: unknown): boolean {
  return value === true || value === 't' || value === 'true' || value === 1;
}

async function ensureMigrationBaselineForLegacySchema() {
  const [legacySchemaRow] = await AppDataSource.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('companies', 'campaigns', 'employees')
      ) AS "exists"
    `,
  );

  const hasLegacySchema = asBoolean(legacySchemaRow?.exists);
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

  const [initialRecordedRow] = await AppDataSource.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM "migrations"
        WHERE "name" = $1
      ) AS "exists"
    `,
    [INITIAL_MIGRATION_NAME],
  );

  const initialRecorded = asBoolean(initialRecordedRow?.exists);
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

async function runMigrations() {
  await AppDataSource.initialize();

  try {
    await ensureMigrationBaselineForLegacySchema();
    const executed = await AppDataSource.runMigrations({ transaction: 'all' });

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
  const message = error instanceof Error ? error.stack ?? error.message : error;
  console.error('[db] Migration failed:', message);
  process.exit(1);
});
