import { Card, Pill, SectionHeader } from "@/components/rps/ui";
import { getResultsData } from "@/lib/repositories/rps-repository";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const { metrics, bars, analysis } = await getResultsData(scenario);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Analytics"
        title="Resultats et signaux d'alerte"
        description="Une page orientee analyse avec indicateurs synthetiques, comparaison inter-departements et interpretation assistee."
      />

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold">Resume KPI</h3>
          <div className="mt-5 space-y-4">
            <div className="rounded-[12px] bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Participation</p>
              <p className="mt-2 text-3xl font-extrabold">{metrics.participationRate}%</p>
            </div>
            <div className="rounded-[12px] bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Average stress</p>
              <p className="mt-2 text-3xl font-extrabold">{metrics.averageStress}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-slate-500">Bar chart</p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Stress by department
          </h3>
          <div className="mt-8 space-y-5">
            {bars.map((bar) => (
              <div key={bar.department}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">{bar.department}</span>
                  <span className="text-slate-500">{bar.average} / 5</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                    style={{ width: `${bar.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-6">
          <p className="text-sm text-slate-500">Response distribution</p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Pie chart
          </h3>
          <div
            className="mx-auto mt-6 h-56 w-56 rounded-full"
            style={{
              background:
                "conic-gradient(#F59E0B 0 48%, #FCD34D 48% 72%, #92400E 72% 100%)",
            }}
          />
        </Card>

        <Card className="p-6">
          <p className="text-sm text-slate-500">AI Analysis</p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Analyse automatique
          </h3>
          <div className="mt-5 space-y-3">
            {analysis.map((item) => (
              <div key={item} className="rounded-[12px] border border-amber-100 bg-amber-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-700">{item}</p>
                  <Pill tone="warning">Alerte</Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}
