"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Pill, PrimaryButton, SectionHeader } from "@/components/rps/ui";
import type { SurveyOption } from "@/lib/repositories/rps-repository";

export function DashboardContent({
  surveys,
  scenario,
}: {
  surveys: SurveyOption[];
  scenario?: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredSurveys = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return surveys.filter((survey) => {
      const matchesSearch =
        !normalizedQuery ||
        survey.companyName.toLowerCase().includes(normalizedQuery) ||
        survey.title.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || survey.status === statusFilter;
      const isVisible = survey.status !== "draft";

      return isVisible && matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter, surveys]);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Tableau de bord"
        title="Liste des sondages"
        description="Accède aux sondages par entreprise, avec statut, taux de complétion et acces direct aux resultats."
        action={
          <Link href="/surveys?tab=create" className="inline-flex">
            <PrimaryButton>Créer un sondage</PrimaryButton>
          </Link>
        }
      />

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
            <option value="all">Tous les statuts</option>
            <option value="active">Activé</option>
            <option value="terminated">Complété</option>
            <option value="archived">Archivé</option>
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
                  const statusTone = survey.status === "active" ? "success" : "neutral";

                  return (
                    <tr key={survey.id} className="border-t border-slate-100 align-top">
                      <td className="px-6 py-4">
                        <p className="font-semibold">{survey.companyName}</p>
                        <p className="mt-1 text-slate-600">{survey.title}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Pill tone={statusTone}>{formatStatusLabel(survey.status)}</Pill>
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
                    Aucun sondage ne correspond a vos critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
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
