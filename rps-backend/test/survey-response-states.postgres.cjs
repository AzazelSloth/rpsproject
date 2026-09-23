// Run from rps-backend after npm run build:
// node test/survey-response-states.postgres.cjs [evidence.json]
// Real PostgreSQL and application services; synthetic data in a temporary schema.
require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { DataSource } = require('typeorm');
const { Workbook } = require('exceljs');
const { AppDataSource } = require('../dist/database/data-source');
const { CampaignParticipantService } = require('../dist/campaign-participant/campaign-participant.service');
const { SurveyExportService } = require('../dist/survey-export/survey-export.service');
const { CampaignParticipant } = require('../dist/campaign-participant/campaign-participant.entity');
const { SurveySubmissionItem } = require('../dist/campaign-participant/survey-submission-item.entity');
const { Company } = require('../dist/company/company.entity');
const { Campaign } = require('../dist/campaign/campaign.entity');
const { Employee } = require('../dist/employee/employee.entity');
const { Question } = require('../dist/question/question.entity');
const { SurveyResponse } = require('../dist/response/response.entity');

async function main() {
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(AppDataSource.options.host),
    'This test only runs against a local PostgreSQL server.');
  const schema = `response_states_test_${randomUUID().replaceAll('-', '')}`;
  const options = { ...AppDataSource.options, synchronize: false, logging: false };
  const admin = new DataSource({ ...options, migrations: [] });
  const db = new DataSource({ ...options, schema,
    extra: { options: `-c search_path=${schema} -c timezone=UTC` } });
  const evidence = {
    executed_at: new Date().toISOString(),
    scope: 'Local PostgreSQL, temporary schema, synthetic data; not the deployed test survey.',
    path: 'getQuestionnaireByToken -> saveDraftByToken -> submitByToken -> SQL -> exportClosedQuestionsExcel',
    queries: [],
  };
  let schemaCreated = false;
  const previousSecret = process.env.SURVEY_EXPORT_PSEUDONYM_SECRET;
  // Dedicated synthetic fixture secret, never written to the evidence.
  process.env.SURVEY_EXPORT_PSEUDONYM_SECRET = randomUUID();
  await admin.initialize();
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    await db.initialize();
    const migrations = await db.runMigrations({ transaction: 'all' });
    evidence.migrations = migrations.map((migration) => migration.name);
    assert.equal(migrations.length, 18);
    const repo = (entity) => db.getRepository(entity);
    const mail = new Proxy({}, { get() { throw new Error('Email is forbidden in this test'); } });
    const service = new CampaignParticipantService(repo(CampaignParticipant), repo(SurveyResponse),
      repo(Question), repo(Employee), repo(Campaign), db, mail);
    const company = await repo(Company).save({ name: 'Synthetic response state test' });
    const campaign = await repo(Campaign).save({ company, name: 'Synthetic closed questions', status: 'active' });
    const choice = await repo(Question).save({ campaign, question_text: 'Question fermee de test',
      question_type: 'choice', choice_options: ['Oui', 'Non'], order_index: 0 });
    const scale = await repo(Question).save({ campaign, question_text: 'Echelle de test',
      question_type: 'scale', choice_options: ['1', '2', '3', '4', '5'], order_index: 1 });
    const group = await repo(Question).save({ campaign, question_text: 'Departement de test',
      question_type: 'choice', choice_options: ['Groupe A', 'Groupe B'], order_index: 2 });

    for (const [index, state] of ['answered', 'skipped', 'declined'].entries()) {
      const department = index === 1 ? 'Groupe B' : 'Groupe A';
      const employee = await repo(Employee).save({ company, department,
        email: `synthetic-${index + 1}@example.test` });
      const participant = await repo(CampaignParticipant).save(repo(CampaignParticipant).create({
        campaign, employee, created_at: new Date(Date.now() - 3_600_000),
      }));
      const token = participant.participation_token;
      await service.getQuestionnaireByToken(token);
      const responses = [{ question_id: group.id, answer: department, response_state: 'answered' }];
      if (state !== 'skipped') {
        for (const question of [choice, scale]) {
          responses.push({ question_id: question.id, response_state: state,
            ...(state === 'answered' ? { answer: question.id === choice.id ? 'Oui' : '4' } : {}) });
        }
      }
      const draft = await service.saveDraftByToken(token, {
        revision: 0, current_section: 0, started: true, responses,
      });
      assert.equal(draft.saved, true);
      const restored = await service.getQuestionnaireByToken(token);
      if (state === 'declined') {
        assert.equal(restored.draft.responses.find((row) => row.question_id === choice.id).response_state, 'declined');
        assert.equal(restored.draft.responses.find((row) => row.question_id === choice.id).answer, null);
      }
      const end = Date.now() - 30_000;
      const start = end - (120 + index * 60) * 1000;
      const result = await service.submitByToken(token, {
        draft_revision: draft.revision, responses,
        timing: { started_at: start, intervals: [{ start, end }] },
      });
      assert.equal(result.submitted, true);
    }

    async function query(label, sql, parameters = []) {
      const rows = await db.query(sql, parameters);
      evidence.queries.push({ label, sql: sql.trim(), parameters, rows });
      return rows;
    }
    const raw = await query('Raw stored states, before any export', `
      SELECT participation_id, original_question_id, question_type, answer, response_state
      FROM survey_submission_items
      WHERE original_question_id IN ($1, $2)
      ORDER BY original_question_id, participation_id`, [choice.id, scale.id]);
    assert.equal(raw.length, 6);
    for (const question of [choice, scale]) {
      const rows = raw.filter((row) => row.original_question_id === question.id);
      assert.deepEqual(rows.map((row) => row.response_state), ['answered', 'skipped', 'declined']);
      assert.deepEqual(rows.map((row) => row.answer), [question.id === choice.id ? 'Oui' : '4', null, null]);
      assert.equal(new Set(rows.map((row) => row.participation_id)).size, 3);
    }
    const counts = await query('Three stored values for each closed question', `
      SELECT original_question_id, COUNT(DISTINCT participation_id)::int AS respondents,
             COUNT(DISTINCT response_state)::int AS distinct_states,
             ARRAY_AGG(DISTINCT response_state ORDER BY response_state) AS stored_states
      FROM survey_submission_items
      WHERE original_question_id IN ($1, $2)
      GROUP BY original_question_id ORDER BY original_question_id`, [choice.id, scale.id]);
    assert.ok(counts.every((row) => row.respondents === 3 && row.distinct_states === 3));

    const constraints = await query('Database constraints', `
      SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint
      WHERE conrelid = 'survey_submission_items'::regclass AND contype = 'c'
      ORDER BY conname`);
    assert.equal(constraints.length, 2);
    await assert.rejects(db.query(`UPDATE survey_submission_items SET response_state = 'unknown'
      WHERE original_question_id = $1`, [choice.id]), (error) => error.code === '23514');
    await assert.rejects(db.query(`UPDATE survey_submission_items SET answer = 'refusal label changed'
      WHERE original_question_id = $1 AND response_state = 'declined'`, [choice.id]),
    (error) => error.code === '23514');
    evidence.constraint_checks = { unknown_state_rejected: true, text_on_declined_rejected: true };

    const combined = await query('Stored group and timing in the same SQL output', `
      SELECT i.participation_id, i.original_question_id, i.response_state, i.answer,
             g.answer AS survey_group, e.department AS employee_department,
             p.timing_started_at, p.timing_intervals,
             CASE WHEN p.timing_started_at IS NULL THEN NULL ELSE
               (SELECT COALESCE(SUM((t->>'end')::bigint - (t->>'start')::bigint), 0) / 1000
                FROM jsonb_array_elements(p.timing_intervals) AS t)
             END AS active_seconds_from_stored_intervals
      FROM survey_submission_items i
      JOIN campaign_participants p ON p.id = i.participation_id
      JOIN employees e ON e.id = p.employee_id
      LEFT JOIN survey_submission_items g ON g.participation_id = p.id AND g.original_question_id = $3
      WHERE i.original_question_id IN ($1, $2)
      ORDER BY i.original_question_id, i.participation_id`, [choice.id, scale.id, group.id]);
    assert.deepEqual(combined.slice(0, 3).map((row) => Number(row.active_seconds_from_stored_intervals)), [120, 180, 240]);
    assert.deepEqual(combined.slice(0, 3).map((row) => row.survey_group), ['Groupe A', 'Groupe B', 'Groupe A']);
    const legacy = await query('Historical responses table does not store skipped rows', `
      SELECT question_id, response_state, answer FROM responses
      WHERE question_id IN ($1, $2) ORDER BY question_id, employee_id`, [choice.id, scale.id]);
    assert.equal(legacy.length, 4);
    assert.ok(legacy.every((row) => row.response_state !== 'skipped'));

    const exporter = new SurveyExportService(repo(Campaign), repo(CampaignParticipant),
      repo(SurveySubmissionItem), repo(SurveyResponse));
    const file = await exporter.exportClosedQuestionsExcel(campaign.id);
    const workbook = new Workbook();
    await workbook.xlsx.load(Uint8Array.from(file.content).buffer);
    const sheet = workbook.worksheets[0];
    const rows = [];
    sheet.eachRow((row) => rows.push(row.values.slice(1)));
    assert.equal(sheet.rowCount, 10); // Header + three questions for each of three respondents.
    for (const question of [choice, scale]) {
      assert.deepEqual(rows.slice(1).filter((row) => row[2] === question.question_text).map((row) => row[5]),
        ['Répondu', 'Sauté', 'Je préfère ne pas répondre']);
    }
    evidence.application_output = { format: 'xlsx (read in memory; no workbook saved)',
      headers: rows[0], rows: rows.slice(1), contains_indeterminate_history: file.containsIndeterminateHistory };
    evidence.limitations = [
      'No canonical question number field or mapping is supplied; internal IDs are not canonical numbers.',
      'The current application export has no canonical number, group column or duration column.',
      'The synthetic department question appears as a response row; it is not propagated to other question rows.',
      'Timing was injected as synthetic input; this is not a browser stopwatch accuracy test.',
      'The six client CSV datasets were not available or imported; the witness report was not generated.',
      'This exercises application services and real repositories, not HTTP routes or the deployed environment.',
    ];
  } finally {
    if (previousSecret === undefined) delete process.env.SURVEY_EXPORT_PSEUDONYM_SECRET;
    else process.env.SURVEY_EXPORT_PSEUDONYM_SECRET = previousSecret;
    try {
      if (db.isInitialized) await db.destroy();
      if (schemaCreated) await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      evidence.temporary_schema_removed = schemaCreated;
    } finally { await admin.destroy(); }
  }
  const json = JSON.stringify(evidence, null, 2) + '\n';
  if (process.argv[2]) writeFileSync(process.argv[2], json, 'utf8');
  console.log(json);
}
main().catch((error) => {
  console.error(JSON.stringify({ test: 'survey-response-states.postgres', error: error.message, code: error.code }));
  process.exitCode = 1;
});
