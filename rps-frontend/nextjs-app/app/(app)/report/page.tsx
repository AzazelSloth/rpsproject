import { Card, PrimaryButton, SectionHeader } from "@/components/rps/ui";
import { getReportData } from "@/lib/repositories/rps-repository";
import Link from "next/link";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const reportData = await getReportData(scenario);
  const exportHref = scenario
    ? `/api/report/export-docx?scenario=${encodeURIComponent(scenario)}`
    : "/api/report/export-docx";

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Report"
        title="Rapport pret a etre partage"
        description="Un format lisible pour comite de direction, DRH et managers avec synthese, zones de risque et recommandations operationnelles."
        action={
          <Link href={exportHref}>
            <PrimaryButton>Telecharger Word</PrimaryButton>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-6 text-white">
          <p className="text-sm text-slate-300">Rapport structure</p>
          <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold">
            {reportData.title}
          </h2>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[1fr_0.8fr]">
          <div className="space-y-5">
            <div className="rounded-[12px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Company name</p>
              <p className="mt-2 text-lg font-semibold">{reportData.companyName}</p>
            </div>
            <div className="rounded-[12px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Participation rate</p>
              <p className="mt-2 text-lg font-semibold">{reportData.participationRate}%</p>
            </div>
            <div className="rounded-[12px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Template</p>
              <p className="mt-2 text-lg font-semibold">{reportData.template.templateName}</p>
            </div>
            <div className="rounded-[12px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Key metrics</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Stress moyen a {reportData.averageStress}/5, {reportData.alertCount} alertes detectees, charge de travail en hausse dans les equipes techniques.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[12px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Risk areas</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {reportData.riskAreas.map((item) => (
                  <span key={item} className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[12px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                {reportData.template.executiveSummaryTitle}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {reportData.template.executiveSummaryBody}
              </p>
            </div>
            <div className="rounded-[12px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Recommendations</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {reportData.template.recommendationsIntro}
              </p>
              <div className="mt-3 space-y-3">
                {reportData.recommendations.map((item) => (
                  <div key={item} className="rounded-[12px] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[12px] border border-slate-200 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                {reportData.template.consultantNotesTitle}
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
