import { PageErrorState } from "@/components/rps/page-error-state";
import { SurveyBuilderDemo } from "@/components/rps/survey-builder-demo";
import { SurveyListTable } from "@/components/rps/survey-list-table";
import { SectionHeader } from "@/components/rps/ui";
import { getServerTrpcCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; tab?: string; campaignId?: string }>;
}) {
  const { scenario, tab, campaignId } = await searchParams;
  const activeTab = tab ?? "create";
  const selectedCampaignId =
    activeTab === "edit" && campaignId
      ? Number.parseInt(campaignId, 10) || null
      : null;

  try {
    if (activeTab === "list") {
      const surveys = await getServerTrpcCaller().data.listSurveys({
        scenario: scenario ?? null,
      });

      return (
        <section className="space-y-6">
          <SectionHeader
            eyebrow="Gestion des sondages"
            title="Liste des sondages"
            description="Consultez les sondages, leur statut et le niveau de completion avant d'acceder aux resultats."
          />

          <SurveyListTable surveys={surveys} scenario={scenario ?? null} />
        </section>
      );
    }

    const surveyBuilderData = await getServerTrpcCaller().data.surveyBuilder({
      scenario: scenario ?? null,
      campaignId: selectedCampaignId,
    });

    return (
      <section className="space-y-6">
      <SectionHeader
        eyebrow="Gestion des sondages"
        title={
          activeTab === "edit" ? "Modifier un sondage" : "Créer un sondage"
        }
        description={
          activeTab === "edit"
            ? "Ajuste le sondage existant, mets a jour les questions et valide la nouvelle version. L'ajout d'entreprise est bloque en mode modification."
            : "Configure un nouveau sondage en choisissant les entreprises a sonder, les questions a poser et le calendrier de diffusion."
        }
      />
      <SurveyBuilderDemo
        initialData={surveyBuilderData}
        mode={activeTab === "edit" ? "edit" : "create"}
      />
      </section>
    );
  } catch (error) {
    return (
      <PageErrorState
        eyebrow="Gestion des sondages"
        title="Sondages"
        description="Cree, modifie ou consulte les sondages disponibles."
        message={
          error instanceof Error
            ? error.message
            : "Les donnees sondage n'ont pas pu etre chargees."
        }
      />
    );
  }
}
