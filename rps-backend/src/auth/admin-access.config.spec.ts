import {
  getSurveyExportAllowedEmails,
  isSurveyExportAllowedEmail,
} from './admin-access.config';

describe('survey export access configuration', () => {
  const originalValue = process.env.SURVEY_EXPORT_ALLOWED_EMAILS;
  const originalTestSurveyValue =
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;

  afterEach(() => {
    restoreEnvValue('SURVEY_EXPORT_ALLOWED_EMAILS', originalValue);
    restoreEnvValue(
      'TEST_SURVEY_DELETE_ALLOWED_EMAILS',
      originalTestSurveyValue,
    );
  });

  it('normalizes and deduplicates exact configured email addresses', () => {
    process.env.SURVEY_EXPORT_ALLOWED_EMAILS =
      ' Cathy@Example.com, genevieve@example.com, CATHY@example.com ';

    expect(getSurveyExportAllowedEmails()).toEqual([
      'cathy@example.com',
      'genevieve@example.com',
    ]);
    expect(isSurveyExportAllowedEmail(' CATHY@EXAMPLE.COM ')).toBe(true);
  });

  it.each([undefined, '', '   '])(
    'fails closed when the configuration is absent or empty (%p)',
    (value) => {
      delete process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;
      restoreEnvValue('SURVEY_EXPORT_ALLOWED_EMAILS', value);

      expect(getSurveyExportAllowedEmails()).toEqual([]);
      expect(isSurveyExportAllowedEmail('cathy@example.com')).toBe(false);
    },
  );

  it.each([
    'cathy@example.com,*@example.com',
    'cathy@example.com,not-an-email',
    'cathy@example.com,',
    'cathy@example',
  ])('fails closed for the entire invalid configuration %p', (value) => {
    process.env.SURVEY_EXPORT_ALLOWED_EMAILS = value;

    expect(getSurveyExportAllowedEmails()).toEqual([]);
    expect(isSurveyExportAllowedEmail('cathy@example.com')).toBe(false);
  });

  it('uses the existing exact server-side account list when the dedicated list is absent', () => {
    delete process.env.SURVEY_EXPORT_ALLOWED_EMAILS;
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS =
      'toky.rao@gmail.com,genevieve.majorbr@gmail.com,cathynomeniavo@gmail.com';

    expect(getSurveyExportAllowedEmails()).toEqual([
      'toky.rao@gmail.com',
      'genevieve.majorbr@gmail.com',
      'cathynomeniavo@gmail.com',
    ]);
    expect(isSurveyExportAllowedEmail('cathynomeniavo@gmail.com')).toBe(true);
    expect(isSurveyExportAllowedEmail('other@gmail.com')).toBe(false);
  });
});

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
