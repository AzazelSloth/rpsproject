function parseEmailList(value?: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseDomainList(value?: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getAllowedAdminEmails() {
  return parseEmailList(process.env.ADMIN_ALLOWED_EMAILS);
}

export function isAdminEmailAllowed(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();

  return getAllowedAdminEmails().some((allowedEmail) => {
    if (allowedEmail.startsWith('*@') && allowedEmail.length > 2) {
      return normalizedEmail.endsWith(allowedEmail.slice(1));
    }

    return allowedEmail === normalizedEmail;
  });
}

export function getTestSurveyDeleteAllowedEmails() {
  return parseEmailList(process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS);
}

export function isTestSurveyDeleteAllowedEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  return getTestSurveyDeleteAllowedEmails().includes(normalizedEmail);
}

export function getAllowedRegistrationDomains(): string[] {
  return parseDomainList(process.env.ALLOWED_REGISTRATION_DOMAINS);
}

export function isRegistrationAllowed(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const allowedDomains = getAllowedRegistrationDomains();

  if (allowedDomains.length === 0) {
    return false;
  }

  return allowedDomains.some((domain) =>
    normalizedEmail.endsWith(`@${domain}`),
  );
}
