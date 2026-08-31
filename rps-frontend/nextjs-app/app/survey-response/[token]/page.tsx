
import { notFound } from "next/navigation";
import { PageErrorState } from "@/components/rps/page-error-state";
import { SurveyResponseDemo } from "@/components/rps/survey-response-demo";
import { Card } from "@/components/rps/ui";
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
        {surveyData.completedAt && !surveyData.conclusionText ? (
          <Card className="mx-auto mb-6 max-w-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-semibold text-emerald-800">
              Ce sondage a déjà été completé.
            </p>
          </Card>
        ) : null}

        {!surveyData.completedAt || surveyData.conclusionText ? (
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
            questions={surveyData.questions}
          />
        ) : null}
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
