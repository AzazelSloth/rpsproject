import { notFound } from "next/navigation";
import { PageErrorState } from "@/components/rps/page-error-state";
import { SurveyResponseDemo } from "@/components/rps/survey-response-demo";
import { getServerTrpcCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export default async function SurveyResponseTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  try {
    const surveyData = await getServerTrpcCaller().data.surveyResponse({
      token,
      scenario: null,
    });

    if (surveyData.status === "not-found") {
      notFound();
    }

    return (
      <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <SurveyResponseDemo
          participantToken={surveyData.participantToken}
          employeeId={surveyData.employeeId}
          employeeName={surveyData.employeeName}
          employeeTitle={surveyData.employeeTitle}
          companyName={surveyData.companyName}
          campaignName={surveyData.campaignName}
          introductionText={surveyData.introductionText}
          conclusionText={surveyData.conclusionText}
          status={surveyData.status}
          completedAt={surveyData.completedAt}
          initialDraft={surveyData.draft}
          draftRevision={surveyData.draftRevision}
          questions={surveyData.questions}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
        <PageErrorState
          eyebrow="Accès employé"
          title="Accès au sondage"
          description="Ouvre le lien individuel reçu par email pour répondre au questionnaire."
          message={
            error instanceof Error
              ? error.message
              : "Le questionnaire n'a pas pu être chargé."
          }
        />
      </div>
    );
  }
}
