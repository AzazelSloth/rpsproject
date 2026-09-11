import { PageErrorState } from "@/components/rps/page-error-state";
import { SectionHeader } from "@/components/rps/ui";
import { getServerSessionUser } from "@/lib/backend/server";
import { hasSurveyExportPermission } from "@/lib/survey-exports/access";
import { getServerTrpcCaller } from "@/lib/trpc/server";
import { ResultsSurveyTable } from "./ResultsSurveyTable";

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; view?: string; campaignId?: string }>;
}) {
  const { scenario } = await searchParams;

  try {
    const [surveys, user] = await Promise.all([
      getServerTrpcCaller().data.listSurveys({
        scenario: scenario ?? null,
      }),
      getServerSessionUser(),
    ]);
    const visibleSurveys = surveys.filter((survey) => survey.status !== "draft");

    return (
      <section className="space-y-6">
        <SectionHeader
          eyebrow="Résultats"
          title="Résultats par sondage"
          description="Sélectionne un sondage pour consulter les indicateurs et les analyses détaillées."
        />

        <ResultsSurveyTable
          surveys={visibleSurveys}
          scenario={scenario ?? null}
          canExportSurveyResponses={hasSurveyExportPermission(user?.permissions)}
        />
      </section>
    );
  } catch (error) {
    return (
      <PageErrorState
        eyebrow="Résultats"
        title="Résultats par sondage"
        description="Consulte les indicateurs et les analyses détaillées du sondage sélectionné."
        message={
          error instanceof Error
            ? error.message
            : "Les résultats n'ont pas pu être chargés."
        }
      />
    );
  }
}
