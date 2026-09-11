import { isSurveyExportAllowedEmail } from './admin-access.config';

export const AUTH_PERMISSIONS = {
  EXPORT_SURVEY_RESPONSES: 'EXPORT_SURVEY_RESPONSES',
} as const;

export type AuthPermission =
  (typeof AUTH_PERMISSIONS)[keyof typeof AUTH_PERMISSIONS];

export function getAuthPermissions(
  email: string | null | undefined,
): AuthPermission[] {
  return isSurveyExportAllowedEmail(email)
    ? [AUTH_PERMISSIONS.EXPORT_SURVEY_RESPONSES]
    : [];
}
