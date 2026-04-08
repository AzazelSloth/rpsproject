import { EmployeesTableDemo } from "@/components/rps/employees-table-demo";
import { SectionHeader } from "@/components/rps/ui";
import { getServerTrpcCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const [managementData, surveyBuilderData] = await Promise.all([
    getServerTrpcCaller().data.employeeManagement({
      scenario: scenario ?? null,
    }),
    getServerTrpcCaller().data.surveyBuilder({
      scenario: scenario ?? null,
    }),
  ]);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Employees"
        title="Suivi des collaborateurs invites"
        description="Vue table simple pour l'import, le statut de reponse et les prochaines actions de relance."
      />
      <EmployeesTableDemo
        managementData={managementData}
        companies={surveyBuilderData.companies}
        defaultCompanyId={surveyBuilderData.companyId ?? managementData.companyId}
        defaultCampaignName={surveyBuilderData.title}
      />
    </section>
  );
}
