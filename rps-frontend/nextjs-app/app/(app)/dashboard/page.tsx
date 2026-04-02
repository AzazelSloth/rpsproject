import { DashboardDemo } from "@/components/rps/dashboard-demo";
import { PrimaryButton, SectionHeader } from "@/components/rps/ui";
import { getServerTrpcCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const dashboardData = await getServerTrpcCaller().data.dashboard({
    scenario: scenario ?? null,
  });

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
