export const SURVEY_EXPORT_PERMISSION = "EXPORT_SURVEY_RESPONSES";

export type SurveyExportKind = "closed" | "text";

export function hasSurveyExportPermission(
  permissions: readonly string[] | null | undefined,
) {
  return permissions?.includes(SURVEY_EXPORT_PERMISSION) ?? false;
}

export function parseSurveyExportParams(
  rawCampaignId: string,
  rawKind: string,
): { campaignId: number; kind: SurveyExportKind } | null {
  const campaignId = Number(rawCampaignId);
  if (!Number.isSafeInteger(campaignId) || campaignId <= 0) {
    return null;
  }

  if (rawKind !== "closed" && rawKind !== "text") {
    return null;
  }

  return { campaignId, kind: rawKind };
}
