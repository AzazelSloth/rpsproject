function parseEmailList(value?: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const EXACT_EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

function parseExactEmailList(value?: string | null): string[] {
  if (!value?.trim()) {
    return [];
  }

  const emails = value.split(',').map((item) => item.trim().toLowerCase());

  if (
    emails.some(
      (email) =>
        !email || email.includes('*') || !EXACT_EMAIL_PATTERN.test(email),
    )
  ) {
    return [];
  }

  return [...new Set(emails)];
}

export function isSurveyTimingAllowedEmail(email: string): boolean {
  const configuredEmails = process.env.SURVEY_TIMING_ALLOWED_EMAILS?.trim()
    ? process.env.SURVEY_TIMING_ALLOWED_EMAILS
    : process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;

  return parseEmailList(
    configuredEmails ??
      'cathynomeniavo@gmail.com,toky.rao@gmail.com,genevieve.majorbr@gmail.com',
  ).includes(email.trim().toLowerCase());
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

export function getSurveyExportAllowedEmails(): string[] {
  const dedicatedConfiguration = process.env.SURVEY_EXPORT_ALLOWED_EMAILS;
  const configuredEmails = dedicatedConfiguration?.trim()
    ? dedicatedConfiguration
    : process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;

  return parseExactEmailList(configuredEmails);
}

export function isSurveyExportAllowedEmail(
  email: string | null | undefined,
): boolean {
  if (!email) {
    return false;
  }

  return getSurveyExportAllowedEmails().includes(email.trim().toLowerCase());
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
