"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import type { SurveyQuestion } from "@/lib/strapi/mappers";

export function SurveyResponseDemo({
  participantToken,
  employeeId,
  employeeName,
  campaignName,
  status,
  completedAt,
  questions,
}: {
  participantToken?: string | null;
  employeeId: number | null;
  employeeName?: string;
  campaignName?: string;
  status?: string;
  completedAt?: string | null;
  questions: SurveyQuestion[];
}) {
  const [stress, setStress] = useState(4);
  const [workload, setWorkload] = useState("Oui");
  const [comment, setComment] = useState(
    "Plus de visibilite sur les priorites et un meilleur equilibre de charge entre les equipes.",
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const completion = useMemo(() => {
    if (!questions.length) {
      return 0;
    }

    let completed = 0;
    if (stress) completed += 1;
    if (workload) completed += 1;
    if (comment.trim()) completed += 1;
    return Math.round((completed / questions.length) * 100);
  }, [comment, questions.length, stress, workload]);

  function handleSubmit() {
    if (completedAt) {
      return;
    }

    setSubmitError(null);

    startTransition(async () => {
      const answers = [
        questions[0]
          ? { questionId: Number(questions[0].id), answer: String(stress) }
          : null,
        questions[1]
          ? { questionId: Number(questions[1].id), answer: workload }
          : null,
        questions[2]
          ? { questionId: Number(questions[2].id), answer: comment.trim() }
          : null,
      ].filter((entry): entry is { questionId: number; answer: string } => Boolean(entry));

      if (!answers.length) {
        setSubmitError("Aucune question exploitable n'a ete trouvee pour ce lien.");
        return;
      }

      try {
        const response = await fetch("/api/survey-responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantToken,
            employeeId,
            answers,
          }),
        });

        if (!response.ok) {
          throw new Error("submit_failed");
        }

        setSubmitted(true);
      } catch {
        setSubmitError("La soumission a echoue. Verifie la configuration du backend.");
      }
    });
  }

  return (
    <Card className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            Questionnaire RPS
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold">
            {campaignName || "Questionnaire RPS"}
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
        <div className="rounded-[12px] border border-slate-200 p-5">
          <p className="text-sm font-semibold">{questions[0]?.title}</p>
          <div className="mt-4 grid grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                onClick={() => setStress(value)}
                className={`rounded-[12px] border px-4 py-3 text-sm font-semibold ${
                  value === stress
                    ? "border-amber-400 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 p-5">
          <p className="text-sm font-semibold">{questions[1]?.title}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {questions[1]?.options?.map((option) => (
              <SecondaryButton
                key={option}
                className={option === workload ? "border-amber-400 bg-amber-50 text-amber-800" : ""}
                onClick={() => setWorkload(option)}
              >
                {option}
              </SecondaryButton>
            ))}
          </div>
        </div>

        <div className="rounded-[12px] border border-slate-200 p-5">
          <p className="text-sm font-semibold">{questions[2]?.title}</p>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="mt-4 min-h-32 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <PrimaryButton
          className="sm:w-auto"
          disabled={isPending || Boolean(completedAt) || !questions.length}
          onClick={handleSubmit}
        >
          {completedAt
            ? "Questionnaire deja complete"
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
