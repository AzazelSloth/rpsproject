"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Pill } from "@/components/rps/ui";
import type { SurveyOption } from "@/lib/repositories/rps-repository";

const STATUS_FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Activé" },
  { value: "draft", label: "Brouillon" },
  { value: "archived", label: "Archivé" },
];

export function SurveyListTable({
  surveys,
  scenario,
}: {
  surveys: SurveyOption[];
  scenario?: string | null;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  // Recherche mise en pause pour le moment.
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSurveys = useMemo(() => {
    // Recherche mise en pause pour le moment.
     const normalizedQuery = searchQuery.trim().toLowerCase();

    return surveys.filter((survey) => {
      const matchesStatus = statusFilter === "all" || survey.status === statusFilter;
      // Recherche mise en pause pour le moment.
      const matchesSearch =
        !normalizedQuery ||
        survey.companyName.toLowerCase().includes(normalizedQuery) ||
        survey.title.toLowerCase().includes(normalizedQuery);

      return matchesStatus;
    });
  }, [statusFilter, surveys]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
       
        <input
          placeholder="recherche le nom de l'entreprise"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        />
         
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-6 py-4">Entreprise</th>
              <th className="px-6 py-4">Statut</th>
              <th className="px-6 py-4">Taux de complétion</th>
              <th className="px-6 py-4">Date de début</th>
              <th className="px-6 py-4">Date de fin</th>
              <th className="px-6 py-4">Résultats</th>
            </tr>
          </thead>
          <tbody>
            {filteredSurveys.length > 0 ? (
              filteredSurveys.map((survey) => {
                const resultsHref = buildResultsHref(survey.id, scenario ?? null);

                return (
                  <tr key={survey.id} className="border-t border-slate-100 align-top">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{survey.companyName}</p>
                      <p className="mt-1 text-slate-600">{survey.title}</p>
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
                        <span className="text-xs text-slate-500">
                          {survey.completedParticipants}/{survey.totalParticipants} participants
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatShortDate(survey.startDate)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatShortDate(survey.endDate)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={resultsHref}
                        className="inline-flex items-center justify-center rounded-[12px] bg-[#181818] px-4 py-2 text-xs font-semibold no-underline shadow-[0_12px_24px_rgba(24,24,24,0.12)] transition hover:-translate-y-0.5 hover:bg-[#242424]"
                        style={{ color: "#ffffff" }}
                      >
                        Voir les résultats
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="border-t border-slate-100">
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  {surveys.length > 0
                    ? "Aucun sondage ne correspond au statut sélectionné."
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

function buildResultsHref(campaignId: number, scenario?: string | null) {
  const params = new URLSearchParams();
  params.set("view", "detail");
  params.set("campaignId", String(campaignId));

  if (scenario) {
    params.set("scenario", scenario);
  }

  return `/results?${params.toString()}`;
}

function getStatusTone(status: string) {
  if (status === "active") {
    return "success";
  }

  if (status === "draft") {
    return "warning";
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
  if (value === "draft") {
    return "Brouillon";
  }

  
  if (value === "archived") {
    return "Archivé";
  }
  return value || "inconnu";
}
