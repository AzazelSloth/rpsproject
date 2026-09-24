"use client";

import { useMemo, useState, useTransition } from "react";
import { useSurveyDraft } from "@/components/rps/use-survey-draft";
import type { BackendSurveyDraft } from "@/lib/responses/survey-draft";
import { Card, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import { SurveyPrivacyFooter } from "@/components/rps/survey-privacy-footer";
import { RichSurveyText } from "@/components/rps/rich-survey-text";
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
  // Informations masquées dans le parcours employé.
  // employeeName,
  // employeeTitle,
  // companyName,
  // campaignName,
  introductionText,
  conclusionText,
  status,
  completedAt,
  initialDraft,
  draftRevision = 0,
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
  initialDraft?: BackendSurveyDraft | null;
  draftRevision?: number;
  questions: SurveyQuestion[];
}) {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const answerableQuestions = useMemo(
    () => questions.filter((question) => question.type !== "section"),
    [questions],
  );
  const surveySections = useMemo(() => buildSurveySections(questions), [questions]);
  const totalSteps = surveySections.length;
  const sectionQuestionIds = useMemo(() => surveySections.map((section) =>
    section.items.filter(({ question }) => question.type !== "section").map(({ question }) => question.id),
  ), [surveySections]);
  const persistence = useSurveyDraft({
    token: participantToken, initialDraft, revision: draftRevision,
    completed: Boolean(completedAt) || status === 'completed', started: !introductionText?.trim(),
    sections: sectionQuestionIds, totalSteps,
  });
  const { answers, currentSection: currentSectionIndex, started: hasStarted } = persistence.draft;
  const { setAnswers, setCurrentSectionIndex, setHasStarted } = persistence;
  const isCompleted = Boolean(completedAt) || status === 'completed' || submitted || persistence.completed;
  const currentSection = surveySections[currentSectionIndex] ?? surveySections[0];
  const isFinalStep = currentSectionIndex === totalSteps - 1;

  function handleSubmit() {
    if (isCompleted) {
      return;
    }

    setSubmitError(null);
    persistence.pauseTiming();

    startTransition(async () => {
      try {
        if (participantToken && !(await persistence.save())) return;
        const snapshot = persistence.getSnapshot();
        const payloadAnswers = buildSurveySubmissionAnswers(
          answerableQuestions.map((question) => question.id), snapshot.draft.answers,
        );
        await getTrpcClient().surveyResponses.submit.mutate({
            participantToken,
            employeeId,
            draftRevision: snapshot.revision,
            timing: snapshot.timing,
            answers: payloadAnswers,
        });

        setSubmitted(true);
        persistence.finish();
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "La soumission a échoué. Vérifie la configuration du backend.";
        setSubmitError(message);
      } finally {
        persistence.resumeTiming();
      }
    });
  }

  if (isCompleted && conclusionText?.trim()) {
    return (
      <Card className="mx-auto max-w-3xl bg-accent-soft p-6 sm:p-8">
        <div className="mt-8 space-y-6">
          <div className="rounded-[12px] border border-line bg-accent-soft p-5 sm:p-6">
            <p className="font-heading text-lg font-bold text-graphite">
              Merci. Votre voix compte dans le portrait.
            </p>
            <RichSurveyText
              text={conclusionText.trim()}
              className="mt-4 text-sm leading-7 text-graphite"
            />
          </div>

          <SurveyPrivacyFooter />
        </div>
      </Card>
    );
  }

  if (isCompleted) {
    return (
      <Card className="mx-auto max-w-3xl border border-line bg-accent-soft p-5">
        <p className="text-sm font-semibold text-accent">
          Ce sondage a déjà  été complété.
        </p>
        <div className="mt-5">
          <SurveyPrivacyFooter />
        </div>
      </Card>
    );
  }

  if (!hasStarted && introductionText?.trim()) {
    return (
      <Card className="mx-auto max-w-3xl p-6 sm:p-8">
        <p className="font-heading text-lg font-bold text-graphite">
          Un portrait de votre milieu de travail.
        </p>
        {/* Titre et entreprise masqués à la demande du client.
        <h1 className="mt-3 font-heading text-3xl font-extrabold text-graphite">
          {campaignName || "Sondage"}
        </h1>
        {companyName ? (
          <p className="mt-2 text-sm font-semibold text-muted">{companyName}</p>
        ) : null}
        */}
        <RichSurveyText
          text={introductionText.trim()}
          className="mt-6 text-sm leading-7 text-graphite"
        />
        <PrimaryButton
          className="mt-8 sm:w-auto"
          disabled={!persistence.ready}
          onClick={() => setHasStarted(true)}
        >
          Commencer le sondage
        </PrimaryButton>
        <div className="mt-8">
          <SurveyPrivacyFooter />
        </div>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <fieldset disabled={!persistence.ready || isPending} className="contents">
      {/* En-tête du questionnaire masqué à la demande du client.
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Sondage
          </p>
          <h1 className="font-heading text-3xl font-extrabold">
            {campaignName || "Sondage"}
          </h1>
          {employeeName ? (
            <p className="mt-2 text-sm text-muted">Attribué à {employeeName}</p>
          ) : null}
        </div>
      </div> */}

      {/* Statut du lien masqué à la demande du client.
      {status ? (
        <div className="mt-4 text-sm text-muted">
          Statut du lien: <span className="font-semibold text-graphite">{status}</span>
        </div>
      ) : null} */}

      <div className="mt-8 space-y-6">
        {/* Informations d'identification masquées dans toutes les étapes.
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[12px] border border-line p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Nom de l&apos;employeur
            </p>
            <input
              value={companyName ?? ""}
              readOnly
              className="mt-3 w-full rounded-[12px] border border-line bg-page px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="rounded-[12px] border border-line p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Prénoms et Nom
            </p>
            <input
              value={employeeName ?? ""}
              readOnly
              className="mt-3 w-full rounded-[12px] border border-line bg-page px-4 py-3 text-sm outline-none"
            />
          </div>
          <div className="rounded-[12px] border border-line p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Titre professionnel
            </p>
            <input
              value={employeeTitle ?? ""}
              readOnly
              className="mt-3 w-full rounded-[12px] border border-line bg-page px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>

        */}

        {totalSteps > 1 ? (
          <nav aria-label="Sections du sondage" className="rounded-[12px] bg-page p-4">
            <div className="flex items-center justify-between gap-4 font-mono text-sm font-semibold text-graphite">
              <span>Étape {currentSectionIndex + 1} sur {totalSteps}</span>
              <span>{currentSection?.title}</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-accent-bright transition-all"
                style={{ width: `${((currentSectionIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </nav>
        ) : null}

        {currentSection?.items.map(({ question, originalIndex }) => (
          <div
            key={question.id}
            className={`rounded-[12px] border p-5 ${
              question.type === "section"
                ? "survey-section-heading border-line"
                : question.sectionId
                  ? "ml-4 border-line bg-surface sm:ml-8"
                  : "border-line bg-surface"
            }`}
          >
            <p className="survey-question-title text-sm font-semibold">
              {question.type === "section"
                ? question.title
                : `${getQuestionNumber(questions, originalIndex)}. ${question.title}`}
            </p>

            {question.type === "section" ? (
              question.helpText && question.helpText !== "Section du questionnaire" ? (
                <p className="mt-2 text-sm text-muted">{question.helpText}</p>
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
                      className={`survey-answer rounded-[12px] px-4 py-3 text-sm font-semibold transition ${
                        answers[question.id] === String(value)
                          ? "survey-answer--selected"
                          : ""
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-5">
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
                        ? "survey-answer survey-answer--selected"
                        : "survey-answer"
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
              <>
                <textarea
                  maxLength={1000}
                  aria-describedby={`answer-length-${question.id}`}
                  value={
                    isPreferNotToAnswer(answers[question.id])
                      ? ""
                      : (answers[question.id] ?? "")
                  }
                  onChange={(event) =>
                    setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                  }
                  disabled={isPreferNotToAnswer(answers[question.id])}
                  className="mt-4 min-h-32 w-full rounded-[12px] border border-line bg-surface px-4 py-3 text-sm outline-none"
                />
                <p id={`answer-length-${question.id}`} className="mt-2 text-right text-xs text-muted">
                  {isPreferNotToAnswer(answers[question.id]) ? 0 : (answers[question.id] ?? "").length}
                  {" / 1 000 caractères"}
                </p>
              </>
            )}
            {question.type !== "section" ? (
              <div className="mt-3">
                <SecondaryButton
                  className={
                    isPreferNotToAnswer(answers[question.id])
                      ? "survey-answer survey-answer--declined"
                      : "survey-answer"
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

        <SurveyPrivacyFooter />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SecondaryButton
          className="sm:w-auto"
          disabled={(currentSectionIndex === 0 && !introductionText?.trim()) || isPending}
          onClick={() => {
            if (currentSectionIndex === 0 && introductionText?.trim()) {
              setHasStarted(false);
            } else {
              setCurrentSectionIndex((index) => Math.max(0, index - 1));
            }
          }}
        >
          Précédente
        </SecondaryButton>
        {participantToken ? (
          <span
            className={`text-center text-sm ${persistence.state === "error" ? "text-graphite" : "text-muted"}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {!persistence.ready ? "Chargement du brouillon…"
              : persistence.state === "error" ? "Enregistrement impossible"
              : persistence.state === "saving" || persistence.state === "dirty" ? "Enregistrement en cours…"
              : persistence.lastSavedAt !== null
                ? `Enregistré à ${new Date(persistence.lastSavedAt).toLocaleTimeString("fr-FR", {
                    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
                  }).replace(":", " h ")}`
                : "Enregistrement automatique"}
          </span>
        ) : null}
        {isFinalStep ? <PrimaryButton
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
          onClick={() => setCurrentSectionIndex((index) => Math.min(totalSteps - 1, index + 1))}
        >
          Suivante
        </PrimaryButton>}
        {submitted ? (
          <span className="text-sm font-medium text-accent">
            Réponses enregistrées.
          </span>
        ) : null}
        {submitError ? (
          <span className="text-sm font-medium text-graphite">{submitError}</span>
        ) : null}
      </div>
      </fieldset>
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
