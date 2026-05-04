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

export function getBootstrapAdminEmails() {
  const bootstrapEmails = parseEmailList(process.env.ADMIN_BOOTSTRAP_EMAILS);
  return bootstrapEmails.length ? bootstrapEmails : getAllowedAdminEmails();
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
  
  return allowedDomains.some(domain => normalizedEmail.endsWith(`@${domain}`));
}
