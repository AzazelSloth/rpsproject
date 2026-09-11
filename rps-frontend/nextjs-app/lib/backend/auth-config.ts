export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isSurveyTimingAllowedEmail(email: string) {
  const configuredEmails = process.env.SURVEY_TIMING_ALLOWED_EMAILS?.trim()
    ? process.env.SURVEY_TIMING_ALLOWED_EMAILS
    : process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;

  return (configuredEmails ??
    'cathynomeniavo@gmail.com,toky.rao@gmail.com,genevieve.majorbr@gmail.com')
    .split(',').map(normalizeAdminEmail).filter(Boolean).includes(normalizeAdminEmail(email));
}

export function getConfiguredAdminEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeAdminEmail(value))
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string) {
  const normalizedEmail = normalizeAdminEmail(email);

  return getConfiguredAdminEmails().some((allowedEmail) => {
    if (allowedEmail.startsWith("*@") && allowedEmail.length > 2) {
      return normalizedEmail.endsWith(allowedEmail.slice(1));
    }

    return allowedEmail === normalizedEmail;
  });
}

export function getTestSurveyDeleteAllowedEmails() {
  return (process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeAdminEmail(value))
    .filter(Boolean);
}

export function isTestSurveyDeleteAllowedEmail(email: string) {
  return getTestSurveyDeleteAllowedEmails().includes(normalizeAdminEmail(email));
}
