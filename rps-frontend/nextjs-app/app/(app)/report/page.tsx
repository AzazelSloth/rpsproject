import { Card, SectionHeader } from "@/components/rps/ui";
import { getServerTrpcCaller } from "@/lib/trpc/server";
import { isBackendConfigured } from "@/lib/backend/client";
import { getServerBackendCollection as getBackendCollection } from "@/lib/backend/server";
import type { BackendCampaign, BackendReport, BackendCompany } from "@/lib/backend/types";
import { CampaignReportsTable } from "./CampaignReportsTable";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; campaignId?: string }>;
}) {
  const { scenario, campaignId } = await searchParams;
  const requestedCampaignId = campaignId ? Number(campaignId) : null;

  if (!isBackendConfigured()) {
    return (
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Rapports"
          title="Rapports Résultats"
          description="Connecte le backend pour gerer les analyses RPS."
        />
        <Card className="p-8 text-center">
          <p className="text-slate-500">Backend non configure.</p>
        </Card>
      </section>
    );
  }

  let campaigns: BackendCampaign[] = [];
  let reports: BackendReport[] = [];
  let companies: BackendCompany[] = [];

  try {
    [campaigns, reports, companies] = await Promise.all([
      getBackendCollection<BackendCampaign>("/campaigns"),
      getBackendCollection<BackendReport>("/reports"),
      getBackendCollection<BackendCompany>("/companies"),
    ]);
  } catch {
    // Fall back to empty state
  }

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Rapports"
        title="Rapports Resultats"
        description="Lance l'analyse IA d'une campagne et retrouve tes rapports dans tes emails."
      />

      <CampaignReportsTable
        campaigns={campaigns}
        reports={reports}
        companies={companies}
        scenario={scenario ?? null}
        initialCampaignId={requestedCampaignId}
      />
    </section>
  );
}
