import { DashboardDemo } from "@/components/rps/dashboard-demo";
import { PrimaryButton, SectionHeader } from "@/components/rps/ui";
import { getDashboardData } from "@/lib/repositories/rps-repository";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const dashboardData = await getDashboardData(scenario);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Dashboard"
        title="Vue d'ensemble instantanee"
        description="Une lecture rapide des signaux faibles et des indicateurs-cles pour orienter les decisions RH et manageriales."
        action={<PrimaryButton>Exporter la synthese</PrimaryButton>}
      />
      <DashboardDemo
        metrics={dashboardData.metrics}
        trendByRange={dashboardData.trendByRange}
        departmentDistribution={dashboardData.departmentDistribution}
        insights={dashboardData.insights}
      />
    </section>
  );
}
