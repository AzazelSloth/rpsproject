import type { DataSource } from 'typeorm';
import { verifySurveyExportSchema } from './verify-survey-export-schema';

describe('verifySurveyExportSchema', () => {
  const release = jest.fn();
  const getTable = jest.fn();
  const showMigrations = jest.fn();
  const source = {
    createQueryRunner: () => ({ getTable, release }),
    showMigrations,
  } as unknown as DataSource;

  beforeEach(() => {
    jest.clearAllMocks();
    getTable.mockResolvedValue({ findColumnByName: () => ({}) });
    showMigrations.mockResolvedValue(false);
  });

  it('accepts a complete schema with no pending migrations', async () => {
    await expect(verifySurveyExportSchema(source)).resolves.toBeUndefined();
    expect(release).toHaveBeenCalled();
  });

  it('blocks deployment when the submission table is absent', async () => {
    getTable.mockImplementation(async (name: string) =>
      name === 'survey_submission_items' ? undefined : { findColumnByName: () => ({}) },
    );
    await expect(verifySurveyExportSchema(source)).rejects.toThrow('survey_submission_items.participation_id');
    expect(release).toHaveBeenCalled();
  });

  it('detects a missing snapshot column even with recorded migrations', async () => {
    getTable.mockResolvedValue({ findColumnByName: (name: string) =>
      name === 'questionnaire_snapshot' ? undefined : {},
    });
    await expect(verifySurveyExportSchema(source)).rejects.toThrow('campaign_participants.questionnaire_snapshot');
    expect(release).toHaveBeenCalled();
  });

  it('blocks deployment when migrations remain pending', async () => {
    showMigrations.mockResolvedValue(true);
    await expect(verifySurveyExportSchema(source)).rejects.toThrow('Pending database migrations');
    expect(release).toHaveBeenCalled();
  });
});
