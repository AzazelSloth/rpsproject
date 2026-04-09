import { EmployeesTableDemo } from "@/components/rps/employees-table-demo";
import { SectionHeader } from "@/components/rps/ui";
import { getServerTrpcCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; campaignId?: string; companyId?: string }>;
}) {
  const { scenario, campaignId, companyId } = await searchParams;
  const [managementData, surveyBuilderData, surveysList] = await Promise.all([
    getServerTrpcCaller().data.employeeManagement({
      scenario: scenario ?? null,
    }),
    getServerTrpcCaller().data.surveyBuilder({
      scenario: scenario ?? null,
    }),
    getServerTrpcCaller().data.listSurveys({
      scenario: scenario ?? null,
    }),
  ]);

  // Use URL params if provided, otherwise fallback to managementData
  const effectiveCampaignId = campaignId ? Number(campaignId) : (surveyBuilderData.campaignId ?? managementData.campaignId);
  const effectiveCompanyId = companyId ? Number(companyId) : (surveyBuilderData.companyId ?? managementData.companyId);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Gestion des employés"
        title="Gestion des employés"
        description="Import des participants et suivi du sondage en cours."
      />
      <EmployeesTableDemo
        managementData={managementData}
        companies={surveyBuilderData.companies}
        defaultCompanyId={effectiveCompanyId}
        defaultCampaignName={surveyBuilderData.title}
        campaignId={effectiveCampaignId}
        companyId={effectiveCompanyId}
      />
    </section>
  );
}
