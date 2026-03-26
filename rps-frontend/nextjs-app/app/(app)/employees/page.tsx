import { EmployeesTableDemo } from "@/components/rps/employees-table-demo";
import { SectionHeader } from "@/components/rps/ui";
import { getEmployeeManagementData } from "@/lib/repositories/rps-repository";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const managementData = await getEmployeeManagementData(scenario);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Employees"
        title="Suivi des collaborateurs invites"
        description="Vue table simple pour l'import, le statut de reponse et les prochaines actions de relance."
      />
      <EmployeesTableDemo managementData={managementData} />
    </section>
  );
}
