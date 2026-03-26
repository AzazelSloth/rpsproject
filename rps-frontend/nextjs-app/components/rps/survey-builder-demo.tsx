"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import type { SurveyBuilderData } from "@/lib/repositories/rps-repository";
import type { SurveyQuestion } from "@/lib/strapi/mappers";

const templateByType: Record<"scale" | "choice" | "text", SurveyQuestion> = {
  scale: {
    id: "new-scale",
    documentId: "question-template-scale",
    type: "scale",
    title: "Comment jugez-vous votre niveau d'energie au travail ?",
    helpText: "Question echelle 1 a 5",
    orderIndex: 99,
  },
  choice: {
    id: "new-choice",
    documentId: "question-template-choice",
    type: "choice",
    title: "Votre manager clarifie-t-il les priorites ?",
    helpText: "Question choix multiple",
    options: ["Oui", "Partiellement", "Non"],
    orderIndex: 99,
  },
  text: {
    id: "new-text",
    documentId: "question-template-text",
    type: "text",
    title: "Quel point devrait etre prioritaire sur le prochain trimestre ?",
    helpText: "Question texte libre",
    orderIndex: 99,
  },
};

export function SurveyBuilderDemo({ initialData }: { initialData: SurveyBuilderData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [startDate, setStartDate] = useState(toDateInputValue(initialData.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initialData.endDate));
  const [questions, setQuestions] = useState(
    initialData.questions.slice().sort((a, b) => a.orderIndex - b.orderIndex),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function runMutation(payload: object, successMessage: string, optimistic?: () => void) {
    setFeedback(null);
    setError(null);

    optimistic?.();

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/surveys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("mutation_failed");
        }

        setFeedback(successMessage);
        router.refresh();
      } catch {
        setError("La mise a jour de la campagne a echoue. Verifie le backend.");
      }
    });
  }

  function saveCampaign() {
    if (initialData.campaignId) {
      runMutation(
        {
          action: "updateCampaign",
          campaignId: initialData.campaignId,
          title,
          startDate,
          endDate,
        },
        "Campagne mise a jour.",
      );
      return;
    }

    if (!initialData.companyId) {
      setError("Aucune societe n'est disponible pour creer une campagne.");
      return;
    }

    runMutation(
      {
        action: "createCampaign",
        companyId: initialData.companyId,
        title,
        startDate,
        endDate,
      },
      "Campagne creee.",
    );
  }

  function addQuestion(type: "scale" | "choice" | "text") {
    if (!initialData.campaignId) {
      setError("La campagne doit exister avant d'ajouter des questions.");
      return;
    }

    const template = templateByType[type];

    runMutation(
      {
        action: "createQuestion",
        campaignId: initialData.campaignId,
        title: template.title,
        type,
        orderIndex: questions.length,
      },
      "Question ajoutee.",
      () => setQuestions((current) => [...current, { ...template, id: `tmp-${Date.now()}` }]),
    );
  }

  function updateQuestion(index: number, field: "title" | "type", value: string) {
    setQuestions((current) =>
      current.map((question, currentIndex) =>
        currentIndex === index
          ? {
              ...question,
              [field]: value,
              options:
                field === "type" && value === "choice"
                  ? ["Oui", "Partiellement", "Non"]
                  : question.options,
            }
          : question,
      ),
    );
  }

  function persistQuestion(question: SurveyQuestion, index: number) {
    if (!Number.isFinite(Number(question.id))) {
      setError("La question doit d'abord etre creee avant edition detaillee.");
      return;
    }

    runMutation(
      {
        action: "updateQuestion",
        questionId: Number(question.id),
        title: question.title,
        type: question.type,
        orderIndex: index,
      },
      "Question mise a jour.",
    );
  }

  function removeQuestion(question: SurveyQuestion) {
    if (!Number.isFinite(Number(question.id))) {
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      return;
    }

    runMutation(
      {
        action: "deleteQuestion",
        questionId: Number(question.id),
      },
      "Question supprimee.",
      () => setQuestions((current) => current.filter((item) => item.id !== question.id)),
    );
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length || !initialData.campaignId) {
      return;
    }

    const nextQuestions = questions.slice();
    [nextQuestions[index], nextQuestions[nextIndex]] = [nextQuestions[nextIndex], nextQuestions[index]];
    const reordered = nextQuestions.map((question, orderIndex) => ({
      ...question,
      orderIndex,
    }));
    setQuestions(reordered);

    const reorderableItems = reordered.filter((question) => Number.isFinite(Number(question.id)));

    runMutation(
      {
        action: "reorderQuestions",
        campaignId: initialData.campaignId,
        items: reorderableItems.map((question) => ({
          questionId: Number(question.id),
          orderIndex: question.orderIndex,
        })),
      },
      "Ordre des questions mis a jour.",
    );
  }

  function changeCampaignStatus(action: "activateCampaign" | "terminateCampaign" | "archiveCampaign") {
    if (!initialData.campaignId) {
      setError("Aucune campagne active n'est disponible.");
      return;
    }

    const successMessage =
      action === "activateCampaign"
        ? "Campagne activee."
        : action === "terminateCampaign"
          ? "Campagne terminee."
          : "Campagne archivee.";

    runMutation(
      {
        action,
        campaignId: initialData.campaignId,
      },
      successMessage,
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Pill>{initialData.status}</Pill>
          {initialData.campaignId ? <Pill tone="neutral">Campaign #{initialData.campaignId}</Pill> : null}
        </div>

        <div className="mt-5 space-y-4">
          <input
            className="w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="min-h-28 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <PrimaryButton disabled={isPending} onClick={saveCampaign}>
            {isPending ? "Enregistrement..." : initialData.campaignId ? "Mettre a jour" : "Creer la campagne"}
          </PrimaryButton>
          <SecondaryButton disabled={isPending} onClick={() => changeCampaignStatus("activateCampaign")}>
            Activer
          </SecondaryButton>
          <SecondaryButton disabled={isPending} onClick={() => changeCampaignStatus("terminateCampaign")}>
            Terminer
          </SecondaryButton>
          <SecondaryButton disabled={isPending} onClick={() => changeCampaignStatus("archiveCampaign")}>
            Archiver
          </SecondaryButton>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <SecondaryButton disabled={isPending} onClick={() => addQuestion("scale")}>
            Ajouter echelle 1-5
          </SecondaryButton>
          <SecondaryButton disabled={isPending} onClick={() => addQuestion("choice")}>
            Ajouter choix multiple
          </SecondaryButton>
          <SecondaryButton disabled={isPending} onClick={() => addQuestion("text")}>
            Ajouter texte libre
          </SecondaryButton>
        </div>

        {feedback ? <p className="mt-4 text-sm font-medium text-emerald-700">{feedback}</p> : null}
        {error ? <p className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}

        <div className="mt-6 space-y-4">
          {questions.map((question, index) => (
            <div key={`${question.id}-${index}`} className="rounded-[12px] border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Bloc {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{question.type}</p>
                </div>
                <div className="flex gap-2">
                  <SecondaryButton className="px-3 py-2" disabled={index === 0} onClick={() => moveQuestion(index, -1)}>
                    Monter
                  </SecondaryButton>
                  <SecondaryButton
                    className="px-3 py-2"
                    disabled={index === questions.length - 1}
                    onClick={() => moveQuestion(index, 1)}
                  >
                    Descendre
                  </SecondaryButton>
                </div>
              </div>
              <input
                value={question.title}
                onChange={(event) => updateQuestion(index, "title", event.target.value)}
                className="mt-4 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              />
              <select
                value={question.type}
                onChange={(event) => updateQuestion(index, "type", event.target.value)}
                className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              >
                <option value="scale">Echelle</option>
                <option value="choice">Choix multiple</option>
                <option value="text">Texte libre</option>
              </select>
              <div className="mt-4 flex flex-wrap gap-3">
                <PrimaryButton disabled={isPending} onClick={() => persistQuestion(question, index)}>
                  Enregistrer la question
                </PrimaryButton>
                <SecondaryButton disabled={isPending} onClick={() => removeQuestion(question)}>
                  Supprimer
                </SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <p className="text-sm text-slate-300">Survey preview</p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Apercu du questionnaire
          </h3>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Campagne
            </p>
            <p className="mt-2 text-lg font-semibold">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>

          {questions.map((question, index) => (
            <div key={`${question.id}-preview-${index}`} className="rounded-[12px] border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Question {index + 1}
              </p>
              <p className="mt-2 text-sm font-medium">{question.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {question.type === "scale"
                  ? "Reponse attendue sur une echelle de 1 a 5."
                  : question.type === "choice"
                    ? "Choix Oui / Partiellement / Non."
                    : "Champ libre pour commentaire qualitatif."}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function toDateInputValue(value: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}
