import { Card, PrimaryButton, SectionHeader } from "@/components/rps/ui";
import { getServerTrpcCaller } from "@/lib/trpc/server";
import DownloadReportButton from "./DownloadReportButton";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const reportData = await getServerTrpcCaller().data.report({
    scenario: scenario ?? null,
  });
  const exportHref = scenario
    ? `/api/report/export-docx?scenario=${encodeURIComponent(scenario)}`
    : "/api/report/export-docx";

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Rapport"
        title="Rapport"
        description="Synthese et recommandations du sondage selectionne."
        action={
          <DownloadReportButton href={exportHref} />
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-6 text-white">
          <p className="text-sm text-slate-300">Rapport structure</p>
          <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold">
            {reportData.title}
          </h2>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="rounded-[16px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#ffffff_100%)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Entreprise</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{reportData.companyName}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[16px] border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Participation</p>
                <p className="mt-2 text-3xl font-extrabold text-emerald-950">{reportData.participationRate}%</p>
              </div>
              <div className="rounded-[16px] border border-amber-100 bg-amber-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Stress moyen</p>
                <p className="mt-2 text-3xl font-extrabold text-amber-950">{reportData.averageStress}/5</p>
              </div>
              <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Alertes</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">{reportData.alertCount}</p>
              </div>
            </div>
            <div className="rounded-[16px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Resume executif</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Stress moyen a {reportData.averageStress}/5, {reportData.alertCount} alertes detectees et plusieurs zones de vigilance a prioriser dans les equipes les plus exposees.
              </p>
              <div className="mt-4 rounded-[14px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Modele utilise</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{reportData.template.templateName}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[16px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Zones de risque</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {reportData.riskAreas.map((item) => (
                  <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[16px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                {reportData.template.executiveSummaryTitle}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {reportData.template.executiveSummaryBody}
              </p>
            </div>
            <div className="rounded-[16px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Recommandations</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {reportData.template.recommendationsIntro}
              </p>
              <div className="mt-3 space-y-3">
                {reportData.recommendations.map((item, index) => (
                  <div key={item} className="rounded-[14px] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[16px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Notes consultant
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {reportData.template.consultantNotesPlaceholder}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
