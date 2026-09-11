import {
  getSurveyExportAllowedEmails,
  isSurveyExportAllowedEmail,
  isSurveyTimingAllowedEmail,
} from './admin-access.config';

describe('survey export access configuration', () => {
  const originalValue = process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;

  afterEach(() => {
    restoreEnvValue('TEST_SURVEY_DELETE_ALLOWED_EMAILS', originalValue);
  });

  it('uses only the shared list for timing access, without default accounts', () => {
    for (const value of [undefined, '', '   ']) {
      restoreEnvValue('TEST_SURVEY_DELETE_ALLOWED_EMAILS', value);
      expect(isSurveyTimingAllowedEmail('cathynomeniavo@gmail.com')).toBe(false);
    }
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS = ' Cathy@Example.com ';
    expect(isSurveyTimingAllowedEmail(' CATHY@example.com ')).toBe(true);
    expect(isSurveyTimingAllowedEmail('other@example.com')).toBe(false);
  });

  it('normalizes and deduplicates exact configured email addresses', () => {
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS =
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
      restoreEnvValue('TEST_SURVEY_DELETE_ALLOWED_EMAILS', value);

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
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS = value;

    expect(getSurveyExportAllowedEmails()).toEqual([]);
    expect(isSurveyExportAllowedEmail('cathy@example.com')).toBe(false);
  });

  it('uses the shared server-side account list', () => {
    delete process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;
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
