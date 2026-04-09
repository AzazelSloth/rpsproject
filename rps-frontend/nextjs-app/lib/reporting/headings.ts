const DEFAULT_EXECUTIVE_SUMMARY_TITLE = "Résumé exécutif";

function normalizeHeading(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function getExecutiveSummaryTitle(title: string) {
  const normalizedTitle = normalizeHeading(title);

  if (!normalizedTitle || normalizedTitle.includes("synthese")) {
    return DEFAULT_EXECUTIVE_SUMMARY_TITLE;
  }

  return title;
}
