import { PageErrorState } from "@/components/rps/page-error-state";
import { Card, Pill, SectionHeader } from "@/components/rps/ui";
import { isBackendConfigured } from "@/lib/backend/client";
import { getServerBackendCollection as getBackendCollection } from "@/lib/backend/server";
import type { BackendCampaign, BackendCompany, BackendReport } from "@/lib/backend/types";
import { getServerTrpcCaller } from "@/lib/trpc/server";
import { CampaignReportsTable } from "./CampaignReportsTable";
import DownloadReportButton from "./DownloadReportButton";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; campaignId?: string }>;
}) {
  const { scenario, campaignId } = await searchParams;
  const requestedCampaignId = campaignId ? Number(campaignId) : null;
  const selectedCampaignId =
    requestedCampaignId && Number.isFinite(requestedCampaignId) ? requestedCampaignId : null;

  if (!isBackendConfigured()) {
    return (
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Rapports"
          title="Rapports Résultats"
          description="Configure le backend pour lancer l'analyse IA de tes campagnes et recevoir tes rapports par email."
        />
        <Card className="p-8 text-center">
          <p className="text-slate-500">Backend non configuré.</p>
        </Card>
      </section>
    );
  }

  try {
    const [campaigns, reports, companies, reportData, resultsData] = await Promise.all([
      getBackendCollection<BackendCampaign>("/campaigns"),
      getBackendCollection<BackendReport>("/reports"),
      getBackendCollection<BackendCompany>("/companies"),
      getServerTrpcCaller().data.report({
        scenario: scenario ?? null,
        campaignId: selectedCampaignId,
      }),
      getServerTrpcCaller().data.results({
        scenario: scenario ?? null,
        campaignId: selectedCampaignId,
      }),
    ]);
    const exportHref = buildExportHref(selectedCampaignId, scenario ?? null);

    return (
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Rapports"
          title="Rapports Résultats"
          description="Analyse des campagnes et rapports par email."
        />

        <ReportOverview report={reportData} results={resultsData} exportHref={exportHref} />

        <CampaignReportsTable
          campaigns={campaigns}
          reports={reports}
          companies={companies}
          scenario={scenario ?? null}
          initialCampaignId={selectedCampaignId}
        />
      </section>
    );
  } catch (error) {
    return (
      <PageErrorState
        eyebrow="Rapports"
        title="Rapports Résultats"
        description="Analyse des campagnes et rapports par email."
        message={
          error instanceof Error ? error.message : "Les rapports n'ont pas pu être chargés."
        }
      />
    );
  }
}

type ReportOverviewProps = {
  report: {
    title: string;
    companyName: string;
    participationRate: number;
    averageStress: number;
    alertCount: number;
    riskAreas: string[];
    recommendations: string[];
    archivedReportPath?: string | null;
  };
  results: {
    metrics: {
      participationRate: number;
      averageStress: string;
    };
    bars: {
      department: string;
      value: number;
      average: string;
    }[];
    analysis: string[];
  };
  exportHref: string;
};

function ReportOverview({ report, results, exportHref }: ReportOverviewProps) {
  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Rapport selectionne</p>
          <h2 className="mt-1 font-[family-name:var(--font-manrope)] text-2xl font-extrabold text-slate-900">
            {report.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{report.companyName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {report.archivedReportPath ? (
            <a
              href={report.archivedReportPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_rgba(24,24,24,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              Ouvrir le rapport archive
            </a>
          ) : null}
          <DownloadReportButton href={exportHref} />
        </div>
      </Card>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Taux de participation",
            value: `${report.participationRate}%`,
            tone: "Lecture exploitable des reponses consolidees.",
          },
          {
            label: "Stress moyen",
            value: `${report.averageStress} / 5`,
            tone: "Indicateur consolide du sondage.",
          },
          {
            label: "Departements analyses",
            value: `${results.bars.length}`,
            tone: "Comparaison entre equipes.",
          },
          {
            label: "Alertes prioritaires",
            value: `${report.alertCount}`,
            tone: "Points de vigilance a traiter.",
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
              <p className="text-sm text-slate-500">Lecture departement par departement</p>
              <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
                Intensite du stress percu
              </h3>
            </div>
            <Pill tone="warning">Priorites de restitution</Pill>
          </div>

          <div className="mt-8 space-y-5">
            {results.bars.map((bar, index) => (
              <div
                key={bar.department}
                className="rounded-[14px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-4"
              >
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
            <p className="text-sm text-slate-500">Repartition des retours</p>
            <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
              Lecture executive
            </h3>
            <div className="mt-5 space-y-4">
              <div className="rounded-[14px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Participation
                </p>
                <p className="mt-2 text-2xl font-extrabold text-emerald-950">
                  {results.metrics.participationRate}%
                </p>
              </div>
              <div className="rounded-[14px] border border-amber-100 bg-amber-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Stress moyen
                </p>
                <p className="mt-2 text-2xl font-extrabold text-amber-950">
                  {results.metrics.averageStress} / 5
                </p>
              </div>
              <div className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Zones de risque
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {report.riskAreas.length ? report.riskAreas.join(", ") : "Aucune zone prioritaire."}
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
              {results.analysis.map((item, index) => (
                <div key={item} className="rounded-[14px] border border-amber-100 bg-amber-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
                    <Pill tone={index === 0 ? "warning" : "neutral"}>
                      {index === 0 ? "Priorite" : "Lecture"}
                    </Pill>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <p className="text-sm text-slate-500">Recommandations</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {report.recommendations.map((item) => (
            <div key={item} className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function buildExportHref(campaignId: number | null, scenario?: string | null) {
  const params = new URLSearchParams();

  if (campaignId) {
    params.set("campaignId", String(campaignId));
  }

  if (scenario) {
    params.set("scenario", scenario);
  }

  const query = params.toString();
  return query ? `/report/export-docx?${query}` : "/report/export-docx";
}
