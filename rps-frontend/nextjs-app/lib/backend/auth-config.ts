export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getConfiguredAdminEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((value) => normalizeAdminEmail(value))
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string) {
  return getConfiguredAdminEmails().includes(normalizeAdminEmail(email));
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
