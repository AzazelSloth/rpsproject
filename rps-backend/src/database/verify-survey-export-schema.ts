import type { DataSource } from 'typeorm';

// Check the actual schema as well as migration history: legacy databases may
// have been synchronized manually or restored from an older backup.
const REQUIRED_COLUMNS: Record<string, string[]> = {
  campaign_participants: ['id', 'campaign_id', 'employee_id', 'completed_at', 'questionnaire_snapshot'],
  survey_submission_items: [
    'id', 'participation_id', 'original_question_id', 'question_text',
    'question_type', 'section_title', 'section_order', 'question_order',
    'choice_options', 'answer', 'response_state', 'created_at',
  ],
  responses: ['response_state', 'deleted_at'],
  questions: ['choice_options', 'section_id'],
  question_sections: ['is_visible'],
};

export async function verifySurveyExportSchema(dataSource: DataSource) {
  const runner = dataSource.createQueryRunner();
  try {
    const missing: string[] = [];
    for (const [tableName, columns] of Object.entries(REQUIRED_COLUMNS)) {
      const table = await runner.getTable(tableName);
      for (const column of columns) {
        if (!table?.findColumnByName(column)) missing.push(`${tableName}.${column}`);
      }
    }
    if (missing.length) {
      throw new Error(`Survey export schema is incomplete: ${missing.join(', ')}`);
    }
    if (await dataSource.showMigrations()) {
      throw new Error('Pending database migrations remain after migration execution.');
    }
    console.log('[db] Survey export schema verified; no pending migrations.');
  } finally {
    await runner.release();
  }
}
