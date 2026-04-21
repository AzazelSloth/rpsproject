import Link from "next/link";
import { SurveyBuilderDemo } from "@/components/rps/survey-builder-demo";
import { Card, Pill, SectionHeader } from "@/components/rps/ui";
import { getServerTrpcCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; tab?: string; campaignId?: string }>;
}) {
  const { scenario, tab, campaignId } = await searchParams;
  const activeTab = tab ?? "create";
  const requestedCampaignId = campaignId ? Number(campaignId) : null;
  const surveyBuilderData = await getServerTrpcCaller().data.surveyBuilder({
    scenario: scenario ?? null,
    campaignId: requestedCampaignId,
  });
  const surveysList =
    activeTab === "list"
      ? await getServerTrpcCaller().data.listSurveys({
          scenario: scenario ?? null,
        })
      : null;

  if (activeTab === "list") {
    return (
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Gestion des sondages"
          title="Liste des sondages"
          description="Consulte les sondages en cours, leur statut et le niveau de completion avant d'acceder aux resultats."
        />

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold">
                Sondages en cours
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Filtre par entreprise ou statut pour retrouver rapidement un sondage.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                placeholder="Rechercher le nom de l'entreprise"
                className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              />
              <select className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none">
                <option value="active">actif</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Entreprise</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Taux de completion</th>
                  <th className="px-6 py-4">Date de debut</th>
                  <th className="px-6 py-4">Date de fin</th>
                  <th className="px-6 py-4">Resultats</th>
                </tr>
              </thead>
              <tbody>
                {surveysList && surveysList.length > 0 ? (
                  surveysList.map((survey) => {
                    const resultsHref = buildResultsHref(survey.id, scenario ?? null);
                    const statusTone =
                      survey.status === "active"
                        ? "success"
                        : survey.status === "draft"
                          ? "warning"
                          : "neutral";

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
                            Voir les resultats
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="border-t border-slate-100">
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      Aucun sondage disponible.
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

  return (
    <section className="space-y-6">
      <SurveyBuilderDemo
        initialData={surveyBuilderData}
        mode={activeTab === "edit" ? "edit" : "create"}
      />
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
    return "actif";
  }
  if (value === "draft" || value === "preparation") {
    return "brouillon";
  }
  if (value === "terminated") {
    return "termine";
  }
  if (value === "archived") {
    return "archive";
  }
  return value || "inconnu";
}
