"use client";

import Link from "next/link";
import { SurveyExportButton } from "@/components/rps/survey-export-button";
import { useMemo, useState } from "react";
import { Card, Pill } from "@/components/rps/ui";
import { hasCampaignEnded } from "@/lib/campaigns/dates";
import type { SurveyOption } from "@/lib/repositories/rps-repository";
import { ResultsAnalyzeButton } from "./ResultsAnalyzeButton";

const STATUS_FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Activé" },
  { value: "terminated", label: "Complété" },
  { value: "archived", label: "Archivé" },
];

export function ResultsSurveyTable({
  surveys,
  scenario,
  canExportSurveyResponses,
}: {
  surveys: SurveyOption[];
  scenario?: string | null;
  canExportSurveyResponses: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSurveys = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery);

    return surveys.filter((survey) => {
      const matchesStatus = statusFilter === "all" || survey.status === statusFilter;
      const searchableText = normalizeSearchText(
        `${survey.companyName} ${survey.title} ${formatStatusLabel(survey.status)}`,
      );
      const matchesSearch = !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchesStatus && matchesSearch;
    });
  }, [searchQuery, statusFilter, surveys]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-heading text-xl font-bold">
            Tableau des sondages
          </h3>
          <p className="mt-1 text-sm text-muted">
            Retrouve rapidement un sondage pour acceder aux resultats ou lancer l'analyse Drive.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Rechercher un sondage"
            placeholder="Rechercher par entreprise ou sondage"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="rounded-[12px] border border-line bg-white px-4 py-3 text-sm outline-none"
          />
          <select
            aria-label="Filtrer les sondages par statut"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-[12px] border border-line bg-white px-4 py-3 text-sm outline-none"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-page uppercase tracking-[0.18em] text-muted">
            <tr>
              <th className="px-6 py-4">Entreprise</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Taux de complétion</th>
              <th className="px-6 py-4">Date de début</th>
              <th className="px-6 py-4">Date de fin</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSurveys.length > 0 ? (
              filteredSurveys.map((survey) => {
                const canAnalyze = hasCampaignEnded(survey.endDate);

                return (
                  <tr key={survey.id} className="border-t border-line align-top">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{survey.companyName}</p>
                      <p className="mt-1 text-muted">{survey.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Pill tone={getStatusTone(survey.status)}>
                        {formatStatusLabel(survey.status)}
                      </Pill>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <Pill tone={survey.participationRate >= 70 ? "success" : "warning"}>
                          {survey.participationRate}%
                        </Pill>
                        <span className="text-xs text-muted">
                          {survey.completedParticipants}/{survey.totalParticipants} participants
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {formatShortDate(survey.startDate)}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {formatShortDate(survey.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <ResultsAnalyzeButton
                          campaignId={survey.id}
                          canAnalyze={canAnalyze}
                          hasDeliveredReport={survey.hasDeliveredReport}
                        />
                        <Link
                          href={buildReportHref(survey.id, scenario ?? null)}
                          className="inline-flex items-center justify-center rounded-[12px] border border-line bg-white px-4 py-2 text-xs font-semibold text-graphite shadow-[0_12px_24px_rgba(31,37,40,0.06)] transition hover:-translate-y-0.5 hover:bg-page"
                        >
                          Rapport
                        </Link>
                        {canExportSurveyResponses ? (
                          <>
                            <SurveyExportButton campaignId={survey.id} kind="closed">
                              Exporter les réponses aux questions fermées
                            </SurveyExportButton>
                            <SurveyExportButton campaignId={survey.id} kind="text">
                              Exporter les réponses aux questions texte
                            </SurveyExportButton>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-t border-line">
                <td colSpan={6} className="px-6 py-12 text-center text-muted">
                  {surveys.length > 0
                    ? "Aucun sondage ne correspond a la recherche."
                    : "Aucun sondage disponible."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function getStatusTone(status: string) {
  if (status === "active" || status === "terminated") {
    return "success";
  }

  return "neutral";
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStatusLabel(value: string) {
  if (value === "active") {
    return "Activé";
  }
  if (value === "terminated") {
    return "Complété";
  }
  if (value === "archived") {
    return "Archivé";
  }
  return value || "inconnu";
}

function buildReportHref(campaignId: number | null, scenario?: string | null) {
  const params = new URLSearchParams();

  if (campaignId) {
    params.set("campaignId", String(campaignId));
  }

  if (scenario) {
    params.set("scenario", scenario);
  }

  const query = params.toString();
  return query ? `/report?${query}` : "/report";
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
