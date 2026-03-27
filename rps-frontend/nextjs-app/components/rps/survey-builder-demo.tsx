"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import type { SurveyBuilderData } from "@/lib/repositories/rps-repository";
import type { SurveyQuestion } from "@/lib/strapi/mappers";

const defaultCampaignDescription =
  "Campagne trimestrielle visant a mesurer le stress, la charge de travail et la qualite de l'environnement professionnel.";

const defaultChoiceOptions = ["Oui", "Partiellement", "Non"];

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
    options: defaultChoiceOptions,
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
  const [companies, setCompanies] = useState(initialData.companies);
  const [campaignId, setCampaignId] = useState(initialData.campaignId);
  const [companyId, setCompanyId] = useState(initialData.companyId);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [status, setStatus] = useState(initialData.status);
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description);
  const [startDate, setStartDate] = useState(toDateInputValue(initialData.startDate));
  const [endDate, setEndDate] = useState(toDateInputValue(initialData.endDate));
  const [questions, setQuestions] = useState(
    initialData.questions
      .slice()
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(ensureQuestionOptions),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canEditQuestions = status !== "active";

  function runMutation<TResponse>(
    payload: object,
    successMessage: string,
    optimistic?: () => void,
    onSuccess?: (result: TResponse) => void,
  ) {
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
          const body = (await response.json().catch(() => null)) as
            | { message?: string }
            | null;
          throw new Error(body?.message || "La mutation a echoue.");
        }

        const body = (await response.json()) as { result?: TResponse };
        if (body.result !== undefined) {
          onSuccess?.(body.result);
        }
        setFeedback(successMessage);
        router.refresh();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "La mise a jour de la campagne a echoue. Verifie le backend.",
        );
      }
    });
  }

  function saveCampaign() {
    if (!companyId) {
      setError("Choisis une entreprise avant d'enregistrer la campagne.");
      return;
    }

    if (campaignId) {
      runMutation(
        {
          action: "updateCampaign",
          campaignId,
          companyId,
          title,
          startDate,
          endDate,
        },
        "Campagne mise a jour.",
      );
      return;
    }

    runMutation<{ id: number; status?: string }>(
      {
        action: "createCampaign",
        companyId,
        title,
        startDate,
        endDate,
      },
      "Campagne creee.",
      undefined,
      (result) => {
        setCampaignId(result.id);
        setStatus(result.status ?? "preparation");
      },
    );
  }

  function createCompany() {
    const trimmedName = newCompanyName.trim();

    if (trimmedName.length < 2) {
      setError("Saisis un nom d'entreprise valide.");
      return;
    }

    runMutation<{ id: number; name: string }>(
      {
        action: "createCompany",
        name: trimmedName,
      },
      "Entreprise ajoutee.",
      undefined,
      (result) => {
        setCompanies((current) => [...current, result]);
        setCompanyId(result.id);
        setNewCompanyName("");
      },
    );
  }

  function startNewCampaign() {
    setCampaignId(null);
    setStatus("draft");
    setTitle("Nouvelle campagne RPS");
    setDescription(defaultCampaignDescription);
    setStartDate("");
    setEndDate("");
    setQuestions([]);
    setFeedback("Mode nouvelle campagne active.");
    setError(null);
  }

  function addQuestion(type: "scale" | "choice" | "text") {
    if (!campaignId) {
      setError("La campagne doit exister avant d'ajouter des questions.");
      return;
    }

    const template = ensureQuestionOptions(templateByType[type]);
    const temporaryId = `tmp-${Date.now()}`;

    runMutation<{ id: number }>(
      {
        action: "createQuestion",
        campaignId,
        title: template.title,
        type,
        options: template.options,
        orderIndex: questions.length,
      },
      "Question ajoutee.",
      () =>
        setQuestions((current) => [
          ...current,
          { ...template, id: temporaryId, documentId: temporaryId },
        ]),
      (result) => {
        setQuestions((current) =>
          current.map((question) =>
            question.id === temporaryId
              ? {
                  ...question,
                  id: String(result.id),
                  documentId: `question-${result.id}`,
                }
              : question,
          ),
        );
      },
    );
  }

  function updateQuestion(index: number, updates: Partial<SurveyQuestion>) {
    setQuestions((current) =>
      current.map((question, currentIndex) => {
        if (currentIndex !== index) {
          return question;
        }

        const nextQuestion = {
          ...question,
          ...updates,
        };

        if (updates.type === "choice") {
          nextQuestion.options = question.options?.length
            ? question.options
            : [...defaultChoiceOptions];
        }

        if (updates.type && updates.type !== "choice") {
          nextQuestion.options = undefined;
        }

        return nextQuestion;
      }),
    );
  }

  function updateChoiceOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((current) =>
      current.map((question, currentIndex) => {
        if (currentIndex !== questionIndex) {
          return question;
        }

        const options = [...(question.options ?? [...defaultChoiceOptions])];
        options[optionIndex] = value;
        return { ...question, options };
      }),
    );
  }

  function addChoiceOption(questionIndex: number) {
    setQuestions((current) =>
      current.map((question, currentIndex) => {
        if (currentIndex !== questionIndex) {
          return question;
        }

        return {
          ...question,
          options: [
            ...(question.options ?? [...defaultChoiceOptions]),
            `Choix ${(question.options?.length ?? defaultChoiceOptions.length) + 1}`,
          ],
        };
      }),
    );
  }

  function removeChoiceOption(questionIndex: number, optionIndex: number) {
    setQuestions((current) =>
      current.map((question, currentIndex) => {
        if (currentIndex !== questionIndex) {
          return question;
        }

        const nextOptions = (question.options ?? []).filter((_, index) => index !== optionIndex);
        return {
          ...question,
          options: nextOptions.length ? nextOptions : [""],
        };
      }),
    );
  }

  function persistQuestion(question: SurveyQuestion, index: number) {
    if (!Number.isFinite(Number(question.id))) {
      setError("La question doit d'abord etre creee avant edition detaillee.");
      return;
    }

    const sanitizedOptions = sanitizeOptions(question.options);

    if (question.type === "choice" && sanitizedOptions.length < 2) {
      setError("Ajoute au moins deux choix pour un QCM.");
      return;
    }

    runMutation(
      {
        action: "updateQuestion",
        questionId: Number(question.id),
        title: question.title,
        type: question.type,
        options: question.type === "choice" ? sanitizedOptions : undefined,
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
    if (nextIndex < 0 || nextIndex >= questions.length || !campaignId) {
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
        campaignId,
        items: reorderableItems.map((question) => ({
          questionId: Number(question.id),
          orderIndex: question.orderIndex,
        })),
      },
      "Ordre des questions mis a jour.",
    );
  }

  function changeCampaignStatus(action: "activateCampaign" | "terminateCampaign" | "archiveCampaign") {
    if (!campaignId) {
      setError("Aucune campagne active n'est disponible.");
      return;
    }

    const successMessage =
      action === "activateCampaign"
        ? "Campagne activee."
        : action === "terminateCampaign"
          ? "Campagne terminee."
          : "Campagne archivee.";

    runMutation<{ status?: string }>(
      {
        action,
        campaignId,
      },
      successMessage,
      undefined,
      (result) => {
        if (result?.status) {
          setStatus(result.status);
        }
      },
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Pill>{status}</Pill>
          {campaignId ? <Pill tone="neutral">Campaign #{campaignId}</Pill> : <Pill tone="neutral">Nouvelle campagne</Pill>}
          <Pill tone="neutral">{questions.length} questions</Pill>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Entreprise</p>
              <select
                value={companyId ?? ""}
                onChange={(event) => setCompanyId(Number(event.target.value))}
                className="mt-3 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="" disabled>
                  Choisir une entreprise
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex gap-3">
                <input
                  value={newCompanyName}
                  onChange={(event) => setNewCompanyName(event.target.value)}
                  className="w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
                  placeholder="Ajouter une nouvelle entreprise"
                />
                <SecondaryButton disabled={isPending} onClick={createCompany}>
                  Ajouter
                </SecondaryButton>
              </div>
            </div>

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
          </div>

          <div className="space-y-4 rounded-[16px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#f7f3eb_100%)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Calendrier</p>
            <div className="grid gap-4">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              />
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Choisis d&apos;abord l&apos;entreprise, enregistre la campagne, puis ajoute les questions et leurs choix.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <PrimaryButton disabled={isPending} onClick={saveCampaign}>
            {isPending ? "Enregistrement..." : campaignId ? "Mettre a jour" : "Creer la campagne"}
          </PrimaryButton>
          <SecondaryButton disabled={isPending} onClick={startNewCampaign}>
            Nouvelle campagne
          </SecondaryButton>
          <SecondaryButton disabled={isPending || !campaignId} onClick={() => changeCampaignStatus("activateCampaign")}>
            Activer
          </SecondaryButton>
          <SecondaryButton disabled={isPending || !campaignId} onClick={() => changeCampaignStatus("terminateCampaign")}>
            Terminer
          </SecondaryButton>
          <SecondaryButton disabled={isPending || !campaignId} onClick={() => changeCampaignStatus("archiveCampaign")}>
            Archiver
          </SecondaryButton>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <SecondaryButton disabled={isPending || !campaignId} onClick={() => addQuestion("scale")}>
            Ajouter echelle 1-5
          </SecondaryButton>
          <SecondaryButton disabled={isPending || !campaignId} onClick={() => addQuestion("choice")}>
            Ajouter QCM
          </SecondaryButton>
          <SecondaryButton disabled={isPending || !campaignId} onClick={() => addQuestion("text")}>
            Ajouter texte libre
          </SecondaryButton>
        </div>

        {feedback ? <p className="mt-4 text-sm font-medium text-emerald-700">{feedback}</p> : null}
        {error ? <p className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}
        {!canEditQuestions ? (
          <p className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            La campagne est active. Les questions ne peuvent plus etre modifiees tant qu&apos;elle reste active.
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          {questions.map((question, index) => (
            <div key={`${question.id}-${index}`} className="rounded-[16px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    Bloc {index + 1}
                  </p>
                  <p className="mt-2 text-sm font-semibold">{question.type}</p>
                </div>
                <div className="flex gap-2">
                  <SecondaryButton
                    className="px-3 py-2"
                    disabled={index === 0 || !canEditQuestions}
                    onClick={() => moveQuestion(index, -1)}
                  >
                    Monter
                  </SecondaryButton>
                  <SecondaryButton
                    className="px-3 py-2"
                    disabled={index === questions.length - 1 || !canEditQuestions}
                    onClick={() => moveQuestion(index, 1)}
                  >
                    Descendre
                  </SecondaryButton>
                </div>
              </div>
              <input
                value={question.title}
                onChange={(event) => updateQuestion(index, { title: event.target.value })}
                disabled={!canEditQuestions}
                className="mt-4 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              />
              <select
                value={question.type}
                onChange={(event) =>
                  updateQuestion(index, { type: event.target.value as SurveyQuestion["type"] })
                }
                disabled={!canEditQuestions}
                className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              >
                <option value="scale">Echelle</option>
                <option value="choice">QCM</option>
                <option value="text">Texte libre</option>
              </select>

              {question.type === "choice" ? (
                <div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                      Choix du QCM
                    </p>
                    <SecondaryButton
                      className="px-3 py-2"
                      disabled={(question.options?.length ?? 0) >= 6 || !canEditQuestions}
                      onClick={() => addChoiceOption(index)}
                    >
                      Ajouter un choix
                    </SecondaryButton>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(question.options ?? [...defaultChoiceOptions]).map((option, optionIndex) => (
                      <div key={`${question.id}-option-${optionIndex}`} className="flex gap-3">
                        <input
                          value={option}
                          onChange={(event) => updateChoiceOption(index, optionIndex, event.target.value)}
                          disabled={!canEditQuestions}
                          className="w-full rounded-[12px] border border-amber-200 bg-white px-4 py-3 text-sm outline-none"
                          placeholder={`Choix ${optionIndex + 1}`}
                        />
                        <SecondaryButton
                          className="px-3 py-2"
                          disabled={(question.options?.length ?? 0) <= 2 || !canEditQuestions}
                          onClick={() => removeChoiceOption(index, optionIndex)}
                        >
                          Retirer
                        </SecondaryButton>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <PrimaryButton disabled={isPending || !canEditQuestions} onClick={() => persistQuestion(question, index)}>
                  Enregistrer la question
                </PrimaryButton>
                <SecondaryButton disabled={isPending || !canEditQuestions} onClick={() => removeQuestion(question)}>
                  Supprimer
                </SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] px-6 py-4 text-white">
          <p className="text-sm text-slate-300">Survey preview</p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Apercu du questionnaire
          </h3>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Campagne
            </p>
            <p className="mt-2 text-lg font-semibold">{title}</p>
            <p className="mt-2 text-sm text-slate-500">
              {companies.find((company) => company.id === companyId)?.name ?? "Entreprise a definir"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>

          {questions.map((question, index) => (
            <div key={`${question.id}-preview-${index}`} className="rounded-[16px] border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Question {index + 1}
              </p>
              <p className="mt-2 text-sm font-medium">{question.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {question.type === "scale"
                  ? "Reponse attendue sur une echelle de 1 a 5."
                  : question.type === "choice"
                    ? "Selection d'un choix parmi les options ci-dessous."
                    : "Champ libre pour commentaire qualitatif."}
              </p>
              {question.type === "choice" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {sanitizeOptions(question.options).map((option) => (
                    <span
                      key={`${question.id}-${option}`}
                      className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function sanitizeOptions(options?: string[]) {
  return (options ?? []).map((option) => option.trim()).filter(Boolean);
}

function ensureQuestionOptions(question: SurveyQuestion): SurveyQuestion {
  if (question.type !== "choice") {
    return question;
  }

  return {
    ...question,
    options: sanitizeOptions(question.options).length
      ? sanitizeOptions(question.options)
      : [...defaultChoiceOptions],
  };
}

function toDateInputValue(value: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}
