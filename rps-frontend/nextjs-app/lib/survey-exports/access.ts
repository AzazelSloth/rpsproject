export const SURVEY_EXPORT_PERMISSION = "EXPORT_SURVEY_RESPONSES";

export type SurveyExportKind = "closed" | "text";
export type SurveyExportFormat = "csv" | "xlsx";

export const SURVEY_EXPORT_CONTENT_TYPES = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export function parseSurveyExportFormat(value: string | null): SurveyExportFormat | null {
  if (value === null || value === "csv") return "csv";
  return value === "xlsx" ? "xlsx" : null;
}

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
