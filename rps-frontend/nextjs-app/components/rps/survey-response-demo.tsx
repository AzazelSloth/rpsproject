"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import type { SurveyQuestion } from "@/lib/strapi/mappers";
import { getTrpcClient } from "@/lib/trpc/client";

export function SurveyResponseDemo({
  participantToken,
  employeeId,
  employeeName,
  employeeTitle,
  companyName,
  campaignName,
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
  status?: string;
  completedAt?: string | null;
  questions: SurveyQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const completion = useMemo(() => {
    if (!questions.length) {
      return 0;
    }

    const completed = questions.filter((question) => (answers[question.id] ?? "").trim()).length;
    return Math.round((completed / questions.length) * 100);
  }, [answers, questions]);

  function handleSubmit() {
    if (completedAt) {
      return;
    }

    setSubmitError(null);

    startTransition(async () => {
      const payloadAnswers = questions
        .map((question) => ({
          questionId: Number(question.id),
          answer: (answers[question.id] ?? "").trim(),
        }))
        .filter((entry) => entry.answer);

      if (payloadAnswers.length !== questions.length) {
        setSubmitError("Merci de repondre a toutes les questions avant l'envoi.");
        return;
      }

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
            : "La soumission a echoue. Verifie la configuration du backend.";
        setSubmitError(message);
      }
    });
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
            <p className="mt-2 text-sm text-slate-500">Attribue a {employeeName}</p>
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
              Prenom et nom
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

        {questions.map((question, index) => (
          <div key={question.id} className="rounded-[12px] border border-slate-200 p-5">
            <p className="text-sm font-semibold">
              {index + 1}. {question.title}
            </p>

            {question.type === "scale" ? (
              <>
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() =>
                        setAnswers((current) => ({ ...current, [question.id]: String(value) }))
                      }
                      className={`rounded-[12px] border px-4 py-3 text-sm font-semibold ${
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
                  {[
                    "Pas du tout d&apos;accord",
                    "Plutot pas d&apos;accord",
                    "Ni d&apos;accord, ni pas d&apos;accord",
                    "Plutot d&apos;accord",
                    "Tout a fait d&apos;accord",
                  ].map((label) => (
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
                        ? "border-amber-400 bg-amber-50 text-amber-800"
                        : ""
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
                value={answers[question.id] ?? ""}
                onChange={(event) =>
                  setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                }
                className="mt-4 min-h-32 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <PrimaryButton
          className="sm:w-auto"
          disabled={isPending || Boolean(completedAt) || !questions.length}
          onClick={handleSubmit}
        >
          {completedAt
            ? "Sondage deja complete"
            : isPending
              ? "Envoi en cours..."
              : "Envoyer mes reponses"}
        </PrimaryButton>
        {submitted ? (
          <span className="text-sm font-medium text-emerald-700">
            Reponses enregistrees.
          </span>
        ) : null}
        {submitError ? (
          <span className="text-sm font-medium text-rose-700">{submitError}</span>
        ) : null}
      </div>
    </Card>
  );
}
