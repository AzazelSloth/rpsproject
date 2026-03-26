import { SurveyBuilderDemo } from "@/components/rps/survey-builder-demo";
import { SectionHeader } from "@/components/rps/ui";
import { getSurveyBuilderData } from "@/lib/repositories/rps-repository";

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { scenario } = await searchParams;
  const surveyBuilderData = await getSurveyBuilderData(scenario);

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Survey Creation"
        title="Concevoir une campagne en quelques blocs"
        description="Un builder minimal oriente RH, avec structure, typologie de questions et apercu du futur questionnaire salarie."
      />
      <SurveyBuilderDemo initialData={surveyBuilderData} />
    </section>
  );
}
