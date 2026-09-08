// Run after npm run build. Uses an isolated schema in the configured PostgreSQL database.
require('dotenv/config');
const assert = require('node:assert/strict');
const { DataSource } = require('typeorm');
const { AppDataSource } = require('../dist/database/data-source');
const { CampaignParticipantService } = require('../dist/campaign-participant/campaign-participant.service');
const { CampaignParticipant } = require('../dist/campaign-participant/campaign-participant.entity');
const { Company } = require('../dist/company/company.entity');
const { Campaign } = require('../dist/campaign/campaign.entity');
const { Employee } = require('../dist/employee/employee.entity');
const { Question } = require('../dist/question/question.entity');
const { SurveyResponse } = require('../dist/response/response.entity');
const { AddParticipationDraft1710000000013 } = require('../dist/database/migrations/1710000000013-AddParticipationDraft');

async function main() {
  const schema = `draft_test_${process.pid}_${Date.now()}`;
  const admin = new DataSource({ ...AppDataSource.options, migrations: [], synchronize: false, logging: false });
  await admin.initialize();
  const db = new DataSource({ ...AppDataSource.options, schema, migrations: [], synchronize: false, logging: false,
    extra: { options: `-c search_path=${schema}` } });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await db.initialize();
    await db.synchronize();
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      const migration = new AddParticipationDraft1710000000013();
      await migration.down(runner);
      await migration.up(runner);
    } finally { await runner.release(); }

    const repo = (entity) => db.getRepository(entity);
    const mail = { sendSurveyReminders: async (recipients) => ({ sent: recipients, failed: [] }) };
    const service = new CampaignParticipantService(repo(CampaignParticipant), repo(SurveyResponse),
      repo(Question), repo(Employee), repo(Campaign), db, mail);
    const company = await repo(Company).save({ name: 'Draft test' });
    const campaign = await repo(Campaign).save({ company, name: 'Survey', status: 'active' });
    const employee = await repo(Employee).save({ company, email: 'draft@example.test' });
    const question = await repo(Question).save({ campaign, question_text: 'Question', question_type: 'text' });
    const participant = await repo(CampaignParticipant).save(repo(CampaignParticipant).create({
      campaign, employee, invitation_sent_at: new Date(),
    }));
    const token = participant.participation_token;
    const payload = { revision: 0, current_section: 1, started: true,
      responses: [{ question_id: question.id, answer: 'partial text', response_state: 'answered' }] };

    const concurrent = await Promise.all([
      service.saveDraftByToken(token, payload), service.saveDraftByToken(token, payload),
    ]);
    assert.equal(concurrent.filter((result) => result.saved).length, 1);
    let questionnaire = await service.getQuestionnaireByToken(token);
    assert.equal(questionnaire.draft.responses[0].answer, 'partial text');
    assert.equal(questionnaire.draft_revision, 1);
    assert.equal(questionnaire.status, 'in_progress');
    assert.equal(questionnaire.completed_at, null);
    assert.equal(questionnaire.employee.id, employee.id);
    assert.equal(questionnaire.questions.length, 1);
    assert.equal(await repo(SurveyResponse).count(), 0);
    assert.equal((await service.findByToken(token)).draft, undefined);
    assert.equal((await service.getCampaignProgress(campaign.id)).in_progress_participants, 1);

    await service.sendReminders(campaign.id, { force: true });
    assert.equal((await service.getQuestionnaireByToken(token)).status, 'in_progress');
    const reminders = await service.getPendingReminders(campaign.id);
    assert.equal(reminders.participants.length, 1);
    assert.ok(reminders.participants[0].survey_url.endsWith(token));
    await service.markReminderSent(participant.id);
    assert.equal((await service.getQuestionnaireByToken(token)).status, 'in_progress');

    const other = await repo(Campaign).save({ company, name: 'Other campaign' });
    const foreign = await repo(Question).save({ campaign: other, question_text: 'Other question' });
    await assert.rejects(service.saveDraftByToken(token, { ...payload, revision: 1,
      responses: [{ question_id: foreign.id, answer: 'invalid' }] }), /must belong/);

    const updated = await service.saveDraftByToken(token, { ...payload, revision: 1,
      responses: [{ question_id: question.id, response_state: 'declined' }] });
    assert.equal(updated.revision, 2);
    questionnaire = await service.getQuestionnaireByToken(token);
    assert.equal(questionnaire.draft.responses[0].answer, null);
    await assert.rejects(service.submitByToken(token, { draft_revision: 1, responses: [] }), /another session/);

    // Locking serializes finalization and an in-flight autosave.
    const finalPayload = { draft_revision: 2,
      responses: [{ question_id: question.id, answer: 'final text' }] };
    const race = await Promise.allSettled([
      service.submitByToken(token, finalPayload),
      service.saveDraftByToken(token, { ...payload, revision: 2 }),
      service.markReminderSent(participant.id),
    ]);
    if (race[0].status === 'rejected') {
      assert.match(race[0].reason.message, /another session/);
      const latest = await service.getQuestionnaireByToken(token);
      await service.submitByToken(token, { ...finalPayload, draft_revision: latest.draft_revision });
    }
    assert.equal(race[1].status, 'fulfilled');
    assert.equal(race[2].status, 'fulfilled');
    const late = await service.saveDraftByToken(token, { ...payload, revision: 2 });
    assert.equal(late.completed, true);
    await service.markReminderSent(participant.id);
    questionnaire = await service.getQuestionnaireByToken(token);
    assert.equal(questionnaire.status, 'completed');
    assert.equal(questionnaire.draft, null);
    assert.equal((await service.getPendingReminders(campaign.id)).participants.length, 0);
    assert.equal((await repo(SurveyResponse).find())[0].answer, 'final text');
    assert.equal(await repo(SurveyResponse).count(), 1);
    console.log('PostgreSQL: migration, draft isolation, concurrent revisions, resume, reminders and finalization passed.');
  } finally {
    if (db.isInitialized) await db.destroy();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.destroy();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
