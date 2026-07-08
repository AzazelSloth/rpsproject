"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Pill } from "@/components/rps/ui";
import { formatTrpcError, getTrpcClient } from "@/lib/trpc/client";
import type { SurveyOption } from "@/lib/repositories/rps-repository";

const STATUS_FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Activé" },
  { value: "terminated", label: "Complété" },
  { value: "draft", label: "Brouillon" },
  { value: "archived", label: "Archivé" },
];

export function SurveyListTable({
  surveys,
  scenario,
  canDeleteTestSurveys = false,
}: {
  surveys: SurveyOption[];
  scenario?: string | null;
  canDeleteTestSurveys?: boolean;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingSurveyId, setDeletingSurveyId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function deleteSurvey(survey: SurveyOption) {
    const confirmed = window.confirm(
      `Supprimer définitivement le sondage "${survey.title}" ? Cette action supprimera aussi les données liées à ce sondage.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setDeletingSurveyId(survey.id);

    try {
      await getTrpcClient().adminSurveys.deleteCampaign.mutate({ campaignId: survey.id });
      router.refresh();
    } catch (error) {
      setDeleteError(formatTrpcError(error));
    } finally {
      setDeletingSurveyId(null);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
       
        <input
          aria-label="Rechercher un sondage"
          placeholder="Rechercher par entreprise ou sondage"
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

      {deleteError ? (
        <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700">
          {deleteError}
        </div>
      ) : null}

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
              {canDeleteTestSurveys ? <th className="px-6 py-4">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {filteredSurveys.length > 0 ? (
              filteredSurveys.map((survey) => {
                const surveyHref = buildSurveyHref(survey.id, scenario ?? null);
                const resultsHref = buildResultsHref(survey.id, scenario ?? null);

                return (
                  <tr key={survey.id} className="border-t border-slate-100 align-top">
                    <td className="px-6 py-4">
                      <p className="font-semibold">{survey.companyName}</p>
                      <Link
                        href={surveyHref}
                        className="mt-1 inline-flex text-slate-600 no-underline transition hover:text-slate-950 hover:underline"
                      >
                        {survey.title}
                      </Link>
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
                    {canDeleteTestSurveys ? (
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          disabled={deletingSurveyId === survey.id}
                          onClick={() => void deleteSurvey(survey)}
                          className="inline-flex items-center justify-center rounded-[12px] border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingSurveyId === survey.id ? "Suppression..." : "Supprimer"}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr className="border-t border-slate-100">
                <td
                  colSpan={canDeleteTestSurveys ? 7 : 6}
                  className="px-6 py-12 text-center text-slate-500"
                >
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

function buildSurveyHref(campaignId: number, scenario?: string | null) {
  const params = new URLSearchParams();
  params.set("tab", "edit");
  params.set("campaignId", String(campaignId));

  if (scenario) {
    params.set("scenario", scenario);
  }

  return `/surveys?${params.toString()}`;
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

  if (status === "terminated") {
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
  if (value === "terminated") {
    return "Complété";
  }

  
  if (value === "archived") {
    return "Archivé";
  }
  return value || "inconnu";
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
