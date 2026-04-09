import { DashboardContent } from "@/components/rps/dashboard-content";
import { getServerTrpcCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const [surveyBuilderData, managementData] = await Promise.all([
    getServerTrpcCaller().data.surveyBuilder({
      scenario: scenario ?? null,
    }),
    getServerTrpcCaller().data.employeeManagement({
      scenario: scenario ?? null,
    }),
  ]);

  return (
    <DashboardContent
      initialSurveyData={surveyBuilderData}
      initialManagementData={managementData}
    />
  );
}
