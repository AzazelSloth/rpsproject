export const allowedAdminEmails = [
  "isabelle@laroche360.ca",
  "roxanne@laroche360.ca",
];

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAllowedAdminEmail(email: string) {
  return allowedAdminEmails.includes(normalizeAdminEmail(email));
}
