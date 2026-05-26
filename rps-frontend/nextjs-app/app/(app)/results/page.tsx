import Link from "next/link";
import { PageErrorState } from "@/components/rps/page-error-state";
import { Card, Pill, PrimaryButton, SectionHeader } from "@/components/rps/ui";
import { getServerTrpcCaller } from "@/lib/trpc/server";
import { ResultsSurveyTable } from "./ResultsSurveyTable";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; view?: string; campaignId?: string }>;
}) {
  const { scenario, view, campaignId } = await searchParams;
  const selectedCampaignId = campaignId ? Number.parseInt(campaignId, 10) || null : null;

  try {
    const [surveys, resultsData, surveyBuilderData, managementData] = await Promise.all([
      getServerTrpcCaller().data.listSurveys({
        scenario: scenario ?? null,
      }),
      getServerTrpcCaller().data.results({
        scenario: scenario ?? null,
        campaignId: selectedCampaignId,
      }),
      getServerTrpcCaller().data.surveyBuilder({
        scenario: scenario ?? null,
        campaignId: selectedCampaignId,
      }),
      getServerTrpcCaller().data.employeeManagement({
        scenario: scenario ?? null,
        campaignId: selectedCampaignId,
      }),
    ]);
    const { metrics, bars, analysis } = resultsData;
    const reportHref = buildReportHref(surveyBuilderData.campaignId, scenario ?? null);
    const visibleSurveys = surveys.filter((survey) => survey.status !== "draft");

    return (
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Résultats"
          title="Résultats par sondage"
          description="Sélectionne un sondage pour consulter les indicateurs, les analyses détaillées et le rapport."
        />

        <ResultsSurveyTable surveys={visibleSurveys} scenario={scenario ?? null} />

        {view === "detail" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold">
                Détail du sondage
              </h2>
              <Link href={reportHref} className="inline-flex">
                <PrimaryButton>Voir le rapport</PrimaryButton>
              </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Taux de participation",
                  value: `${metrics.participationRate}%`,
                  tone: "Le niveau de réponse permet une lecture exploitable.",
                },
                {
                  label: "Stress moyen",
                  value: `${metrics.averageStress} / 5`,
                  tone: "Indicateur consolidé sur les réponses reçues.",
                },
                {
                  label: "Départements analysés",
                  value: `${bars.length}`,
                  tone: "Comparaison inter-équipes en temps réel.",
                },
                {
                  label: "Alertes prioritaires",
                  value: `${analysis.length}`,
                  tone: "Points de vigilance à partager aux managers.",
                },
              ].map((item) => (
                <Card key={item.label} className="overflow-hidden p-5">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-[#f0c36d]" />
                  <p className="mt-4 text-sm font-medium text-slate-500">{item.label}</p>
                  <p className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold text-slate-900">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.tone}</p>
                </Card>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Lecture département par département</p>
                    <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
                      Intensité du stress perçu
                    </h3>
                  </div>
                  <Pill tone="warning">Priorités de restitution</Pill>
                </div>

                <div className="mt-8 space-y-5">
                  {bars.map((bar, index) => (
                    <div key={bar.department} className="rounded-[14px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{bar.department}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            Rang {index + 1}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">{bar.average} / 5</p>
                          <p className="text-xs text-slate-500">stress moyen</p>
                        </div>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                          style={{ width: `${Math.max(bar.value, 8)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="space-y-5">
                <Card className="p-6">
                  <p className="text-sm text-slate-500">Répartition des retours</p>
                  <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
                    Lecture executive
                  </h3>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        Participation
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-emerald-950">
                        {metrics.participationRate}%
                      </p>
                    </div>
                    <div className="rounded-[14px] border border-amber-100 bg-amber-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                        Stress moyen
                      </p>
                      <p className="mt-2 text-2xl font-extrabold text-amber-950">
                        {metrics.averageStress} / 5
                      </p>
                    </div>
                    <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Recommandation de lecture
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Commencer par les équipes les plus exposées, puis relier les écarts à la participation et au contexte managerial.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <p className="text-sm text-slate-500">Analyse automatique</p>
                  <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
                    Points saillants
                  </h3>
                  <div className="mt-5 space-y-3">
                    {analysis.map((item, index) => (
                      <div key={item} className="rounded-[14px] border border-amber-100 bg-amber-50 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
                          <Pill tone={index === 0 ? "warning" : "neutral"}>{index === 0 ? "Priorite" : "Lecture"}</Pill>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </section>
    );
  } catch (error) {
    return (
      <PageErrorState
        eyebrow="Résultats"
        title="Résultats par sondage"
        description="Consulte les indicateurs et les analyses détaillées du sondage sélectionné."
        message={
          error instanceof Error
            ? error.message
            : "Les résultats n'ont pas pu être chargés."
        }
      />
    );
  }
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
