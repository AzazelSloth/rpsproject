"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import {
  buildSurveySubmissionAnswers,
  isPreferNotToAnswer,
  PREFER_NOT_TO_ANSWER,
  togglePreferNotToAnswer,
} from "@/components/rps/survey-response-answer";
import type { SurveyQuestion } from "@/lib/strapi/mappers";
import { getTrpcClient } from "@/lib/trpc/client";

export function SurveyResponseDemo({
  participantToken,
  employeeId,
  employeeName,
  employeeTitle,
  companyName,
  campaignName,
  introductionText,
  conclusionText,
  status,
  completedAt,
  questions,
}: {
  participantToken?: string | null;
  employeeId: number | null;
  employeeName?: string;
  employeeTitle?: string;
  companyName?: string;
  campaignName?: string;
  introductionText?: string;
  conclusionText?: string;
  status?: string;
  completedAt?: string | null;
  questions: SurveyQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hasStarted, setHasStarted] = useState(() => !introductionText?.trim());
  const [submitted, setSubmitted] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isCompleted = Boolean(completedAt) || submitted;
  const answerableQuestions = useMemo(
    () => questions.filter((question) => question.type !== "section"),
    [questions],
  );
  const surveySections = useMemo(() => buildSurveySections(questions), [questions]);
  const currentSection = surveySections[currentSectionIndex] ?? surveySections[0];
  const isLastSection = currentSectionIndex === surveySections.length - 1;

  const completion = useMemo(() => {
    if (!answerableQuestions.length) {
      return 0;
    }

    const completed = answerableQuestions.filter((question) => (answers[question.id] ?? "").trim()).length;
    return Math.round((completed / answerableQuestions.length) * 100);
  }, [answers, answerableQuestions]);

  function handleSubmit() {
    if (isCompleted) {
      return;
    }

    setSubmitError(null);

    startTransition(async () => {
      const payloadAnswers = buildSurveySubmissionAnswers(
        answerableQuestions.map((question) => question.id),
        answers,
      );

      try {
        await getTrpcClient().surveyResponses.submit.mutate({
            participantToken,
            employeeId,
            answers: payloadAnswers,
        });

        setSubmitted(true);
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "La soumission a échoué. Vérifie la configuration du backend.";
        setSubmitError(message);
      }
    });
  }

  if (isCompleted) {
    return (
      <Card className="mx-auto max-w-3xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-800">
          Ce sondage a déjà  été complété.
        </p>
      </Card>
    );
  }

  if (!hasStarted && introductionText?.trim()) {
    return (
      <Card className="mx-auto max-w-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
          Introduction
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold text-slate-950">
          {campaignName || "Sondage RPS"}
        </h1>
        {companyName ? (
          <p className="mt-2 text-sm font-semibold text-slate-500">{companyName}</p>
        ) : null}
        <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">
          {introductionText.trim()}
        </p>
        <PrimaryButton className="mt-8 sm:w-auto" onClick={() => setHasStarted(true)}>
          Commencer le sondage
        </PrimaryButton>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            Sondage RPS
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold">
            {campaignName || "Sondage RPS"}
          </h1>
          {employeeName ? (
            <p className="mt-2 text-sm text-slate-500">Attribué à {employeeName}</p>
          ) : null}
        </div>
        <div className="rounded-[12px] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
          Progression {completion}%
        </div>
      </div>

      {status ? (
        <div className="mt-4 text-sm text-slate-500">
          Statut du lien: <span className="font-semibold text-slate-700">{status}</span>
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[12px] border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Nom de l&apos;employeur
            </p>
            <input
              value={companyName ?? ""}
              readOnly
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="rounded-[12px] border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Prénoms et Nom
            </p>
            <input
              value={employeeName ?? ""}
              readOnly
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="rounded-[12px] border border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Titre professionnel
            </p>
            <input
              value={employeeTitle ?? ""}
              readOnly
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>

        {surveySections.length > 1 ? (
          <nav aria-label="Sections du sondage" className="rounded-[12px] bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-700">
              <span>Section {currentSectionIndex + 1} sur {surveySections.length}</span>
              <span>{currentSection?.title}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${((currentSectionIndex + 1) / surveySections.length) * 100}%` }}
              />
            </div>
          </nav>
        ) : null}

        {currentSection?.items.map(({ question, originalIndex }) => (
          <div
            key={question.id}
            className={`rounded-[12px] border p-5 ${
              question.type === "section"
                ? "border-amber-300 bg-amber-50"
                : question.sectionId
                  ? "ml-4 border-slate-200 sm:ml-8"
                  : "border-slate-200"
            }`}
          >
            <p className="text-sm font-semibold">
              {question.type === "section"
                ? question.title
                : `${getQuestionNumber(questions, originalIndex)}. ${question.title}`}
            </p>

            {question.type === "section" ? (
              question.helpText && question.helpText !== "Section du questionnaire" ? (
                <p className="mt-2 text-sm text-slate-600">{question.helpText}</p>
              ) : null
            ) : question.type === "scale" ? (
              <>
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [question.id]: String(value) }))
                      }
                      className={`rounded-[12px] border px-4 py-3 text-sm font-semibold transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        answers[question.id] === String(value)
                          ? "border-amber-400 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-5">
                  {(question.options?.length === 5
                    ? question.options
                    : [
                        "Pas du tout d'accord",
                        "Plutôt pas d'accord",
                        "Ni d'accord, ni pas d'accord",
                        "Plutôt d'accord",
                        "Tout à fait d'accord",
                      ]
                  ).map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </>
            ) : question.type === "choice" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {(question.options ?? []).map((option) => (
                  <SecondaryButton
                    key={option}
                    className={
                      answers[question.id] === option
                        ? "border !border-amber-400 !bg-amber-50 !text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        : "border !border-slate-200 !bg-white !text-slate-700 hover:!border-amber-300 hover:!bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    }
                    onClick={() =>
                      setAnswers((current) => ({ ...current, [question.id]: option }))
                    }
                  >
                    {option}
                  </SecondaryButton>
                ))}
              </div>
            ) : (
              <textarea
                value={
                  isPreferNotToAnswer(answers[question.id])
                    ? ""
                    : (answers[question.id] ?? "")
                }
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                }
                disabled={isPreferNotToAnswer(answers[question.id])}
                className="mt-4 min-h-32 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              />
            )}
            {question.type !== "section" ? (
              <div className="mt-3">
                <SecondaryButton
                  className={
                    isPreferNotToAnswer(answers[question.id])
                      ? "border !border-slate-700 !bg-slate-700 !text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      : "border !border-slate-200 !bg-white !text-slate-700 hover:!border-amber-300 hover:!bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                  }
                  onClick={() =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: togglePreferNotToAnswer(current[question.id]),
                    }))
                  }
                >
                  {PREFER_NOT_TO_ANSWER}
                </SecondaryButton>
              </div>
            ) : null}
          </div>
        ))}

        {isLastSection && conclusionText?.trim() ? (
          <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              Conclusion
            </p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {conclusionText.trim()}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SecondaryButton
          className="sm:w-auto"
          disabled={currentSectionIndex === 0 || isPending}
          onClick={() => setCurrentSectionIndex((index) => Math.max(0, index - 1))}
        >
          Précédente
        </SecondaryButton>
        {isLastSection ? <PrimaryButton
          className="sm:w-auto"
          disabled={isPending || !answerableQuestions.length}
          onClick={handleSubmit}
        >
          {completedAt
            ? "Sondage déjà complété"
            : isPending
              ? "Envoi en cours..."
              : "Envoyer mes réponses"}
        </PrimaryButton> : <PrimaryButton
          className="sm:w-auto"
          onClick={() => setCurrentSectionIndex((index) => Math.min(surveySections.length - 1, index + 1))}
        >
          Suivante
        </PrimaryButton>}
        {submitted ? (
          <span className="text-sm font-medium text-emerald-700">
            Réponses enregistrées.
          </span>
        ) : null}
        {submitError ? (
          <span className="text-sm font-medium text-rose-700">{submitError}</span>
        ) : null}
      </div>
    </Card>
  );
}

function buildSurveySections(questions: SurveyQuestion[]) {
  const sections: Array<{
    id: string;
    title: string;
    items: Array<{ question: SurveyQuestion; originalIndex: number }>;
  }> = [];
  const sectionById = new Map<number, (typeof sections)[number]>();
  let generalSection: (typeof sections)[number] | null = null;

  questions.forEach((question, originalIndex) => {
    if (question.type === "section") {
      const section = {
        id: question.id,
        title: question.title,
        items: [{ question, originalIndex }],
      };
      sections.push(section);
      if (question.sectionId) sectionById.set(question.sectionId, section);
      return;
    }

    const section = question.sectionId ? sectionById.get(question.sectionId) : undefined;
    if (section) {
      section.items.push({ question, originalIndex });
      return;
    }

    if (!generalSection) {
      generalSection = { id: "general", title: "Questions générales", items: [] };
      sections.unshift(generalSection);
    }
    generalSection.items.push({ question, originalIndex });
  });

  return sections.filter((section) =>
    section.items.some(({ question }) => question.type !== "section"),
  );
}

function getQuestionNumber(questions: SurveyQuestion[], targetIndex: number) {
  return questions
    .slice(0, targetIndex + 1)
    .filter((question) => question.type !== "section").length;
}
