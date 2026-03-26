import Link from "next/link";
import { notFound } from "next/navigation";
import { SurveyResponseDemo } from "@/components/rps/survey-response-demo";
import { Card } from "@/components/rps/ui";
import { getSurveyResponseData } from "@/lib/repositories/rps-repository";

export default async function SurveyResponseTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const surveyData = await getSurveyResponseData(token);

  if (surveyData.status === "not-found") {
    notFound();
  }

  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto mb-6 flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            Employee side
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold">
            {surveyData.campaignName || "Parcours de reponse"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Questionnaire attribue a {surveyData.employeeName || "ce salarie"}.
          </p>
        </div>
        <Link
          href="/survey-response"
          className="rounded-[12px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Changer de lien
        </Link>
      </div>

      {surveyData.completedAt ? (
        <Card className="mx-auto mb-6 max-w-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-semibold text-emerald-800">
            Ce questionnaire a deja ete complete.
          </p>
        </Card>
      ) : null}

      <SurveyResponseDemo
        participantToken={surveyData.participantToken}
        employeeId={surveyData.employeeId}
        employeeName={surveyData.employeeName}
        campaignName={surveyData.campaignName}
        status={surveyData.status}
        completedAt={surveyData.completedAt}
        questions={surveyData.questions}
      />
    </div>
  );
}
