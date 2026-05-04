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
