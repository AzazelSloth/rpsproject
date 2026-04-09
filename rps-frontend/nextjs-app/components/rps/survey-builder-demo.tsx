"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Card, Pill, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import type { SurveyBuilderData } from "@/lib/repositories/rps-repository";
import type { SurveyQuestion } from "@/lib/strapi/mappers";
import { getTrpcClient } from "@/lib/trpc/client";

const defaultChoiceOptions = ["Oui", "Partiellement", "Non"];
const scaleAnswerGuide = [
  { value: 1, label: "Pas du tout d'accord" },
  { value: 2, label: "Plutot pas d'accord" },
  { value: 3, label: "Neutre" },
  { value: 4, label: "Plutot d'accord" },
  { value: 5, label: "Tout a fait d'accord" },
];

type ImportedParticipantPayload = {
  employee?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  first_name?: string;
  last_name?: string;
  email?: string;
  participation_token?: string;
  token?: string;
};

type ImportEmployeesResponse = {
  imported_employees?: number;
  participants?: ImportedParticipantPayload[];
};

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

type SurveyBuilderMode = "create" | "edit";

export function SurveyBuilderDemo({
  initialData,
  mode,
}: {
  initialData: SurveyBuilderData;
  mode: SurveyBuilderMode;
}) {
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsv, setImportCsv] = useState(
    "Nom,Prénom,Adresse courriel,Fonction\nLefebvre,Anne,anne.lefebvre@test.com,gestionnaire\nTremblay,Marc,marc.tremblay@test.com,cadre",
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importValidationErrors, setImportValidationErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState<{
    count: number;
    participants: Array<{ name: string; email: string; link: string }>;
  } | null>(null);
  const canEditQuestions = status !== "active";
  const isCreateMode = mode === "create";
  const selectedCompanyName =
    companies.find((company) => company.id === companyId)?.name?.trim() ?? "";
  const trimmedTitle = title.trim();
  const effectiveCampaignTitle = selectedCompanyName || trimmedTitle;
  const isDateRangeInvalid = isEndDateBeforeStartDate(startDate, endDate);
  const canSaveCampaign =
    Boolean(companyId) && effectiveCampaignTitle.length >= 3 && !isDateRangeInvalid;
  const isSurveyReadyForImport = Boolean(campaignId && companyId && canSaveCampaign);

  function runMutation<TResponse>(
    mutation: () => Promise<TResponse>,
    successMessage: string,
    optimistic?: () => void,
    onSuccess?: (result: TResponse) => void,
  ) {
    setFeedback(null);
    setError(null);

    optimistic?.();

    startTransition(async () => {
      try {
        const result = await mutation();
        if (result !== undefined) {
          onSuccess?.(result);
        }
        setFeedback(successMessage);
        router.refresh();
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "La mise a jour du sondage a echoue. Verifie le backend.",
        );
      }
    });
  }

  function createCompany() {
    if (!isCreateMode) {
      setError("L'ajout d'entreprise est desactive en mode modification.");
      return;
    }

    const trimmedName = newCompanyName.trim();

    if (trimmedName.length < 2 || trimmedName.length > 150) {
      setError("Le nom de l'entreprise doit contenir entre 2 et 150 caracteres.");
      return;
    }

    const alreadyExists = companies.some(
      (company) => company.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (alreadyExists) {
      setError("Cette entreprise existe deja. Selectionne-la dans la liste.");
      return;
    }

    runMutation<{ id: number; name: string }>(
      () =>
        getTrpcClient().adminSurveys.createCompany.mutate({
          name: trimmedName,
        }),
      "Entreprise creee et selectionnee.",
      undefined,
      (result) => {
        setCompanies((current) => [...current, result]);
        setCompanyId(result.id);
        setTitle(result.name);
        setNewCompanyName("");
      },
    );
  }

  function validateCampaignBeforeSave() {
    if (!companyId) {
      setError("Choisis une entreprise avant d'enregistrer le sondage.");
      return false;
    }

    if (effectiveCampaignTitle.length < 3) {
      setError("Le nom de l'entreprise doit contenir au moins 3 caracteres.");
      return false;
    }

    if (isDateRangeInvalid) {
      setError("La date de fin doit etre posterieure ou egale a la date de debut.");
      return false;
    }

    if (mode === "edit" && !campaignId) {
      setError("Aucun sondage existant a modifier.");
      return false;
    }

    return true;
  }

  function handleCompanySelection(nextCompanyId: number) {
    setCompanyId(nextCompanyId);

    const nextCompanyName =
      companies.find((company) => company.id === nextCompanyId)?.name?.trim() ?? "";

    if (!campaignId || !trimmedTitle || trimmedTitle === selectedCompanyName) {
      setTitle(nextCompanyName);
    }
  }

  function saveCampaign() {
    if (!validateCampaignBeforeSave()) {
      return;
    }

    const selectedCompanyId = companyId;
    if (selectedCompanyId === null) {
      setError("Choisis une entreprise avant d'enregistrer le sondage.");
      return;
    }

    if (campaignId) {
      runMutation(
        () =>
          getTrpcClient().adminSurveys.updateCampaign.mutate({
            campaignId,
            companyId: selectedCompanyId,
            title: effectiveCampaignTitle,
            description: description.trim() || undefined,
            startDate,
            endDate,
          }),
        "Sondage mis a jour.",
      );
      return;
    }

    runMutation<{ id: number; status?: string }>(
        () =>
          getTrpcClient().adminSurveys.createCampaign.mutate({
            companyId: selectedCompanyId,
            title: effectiveCampaignTitle,
            description: description.trim() || undefined,
            startDate,
            endDate,
          }),
      "Sondage cree.",
      undefined,
      (result) => {
        setCampaignId(result.id);
        setStatus(result.status ?? "preparation");
        const params = new URLSearchParams();
        params.set("tab", "edit");
        params.set("campaignId", String(result.id));
        router.push(`/surveys?${params.toString()}`);
      },
    );
  }

  function openImportModal() {
    if (!campaignId || !companyId) {
      setError("Enregistrez d'abord le sondage avec son entreprise avant d'importer les employés.");
      return;
    }

    setImportError(null);
    setImportFeedback(null);
    setIsImportModalOpen(true);
  }

  function closeImportModal() {
    setIsImportModalOpen(false);
  }

  function validateImportCsv() {
    const validation = validateCsvFormat(importCsv);
    setImportValidationErrors(validation.errors);
    return validation;
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImportError(null);
    setImportFeedback(null);
    setImportValidationErrors([]);
    setSelectedFileName(file.name);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv" || extension === "txt") {
        const text = await file.text();
        setImportCsv(normalizeCsv(text));
        setImportFeedback(`Fichier chargé : ${file.name}`);
        return;
      }

      if (!["xlsx", "xls"].includes(extension || "")) {
        setImportError("Format non supporté. Utilisez .xlsx, .xls, .csv ou .txt");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error("empty_workbook");
      }

      const firstSheet = workbook.Sheets[firstSheetName];
      const parsedCsv = XLSX.utils.sheet_to_csv(firstSheet);

      setImportCsv(normalizeCsv(parsedCsv));
      setImportFeedback(`Fichier chargé : ${file.name}`);
    } catch {
      setImportError("Le fichier n'a pas pu être lu. Vérifiez le format et réessayez.");
    } finally {
      event.target.value = "";
    }
  }

  function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
      } catch {
        // ignore fallback errors during demo flow
      }

      document.body.removeChild(textArea);
      resolve();
    });
  }

  function copyAllLinks() {
    if (!importSuccess) {
      return;
    }

    const links = importSuccess.participants.map((participant) => `${participant.name}: ${participant.link}`).join("\n");
    copyToClipboard(links).then(() => {
      setImportFeedback("Tous les liens ont été copiés dans le presse-papiers.");
    });
  }

  function downloadLinksList() {
    if (!importSuccess) {
      return;
    }

    const headers = ["Nom", "Prénom", "Email", "Fonction", "Lien sondage unique"];
    const rows = importSuccess.participants.map((participant) => {
      const parts = participant.name.split(" ");
      return [parts.slice(1).join(" "), parts[0] ?? "", participant.email, "", participant.link];
    });
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const exportMeta = [
      `Entreprise: ${selectedCompanyName || "Entreprise"}`,
      `Sondage: ${effectiveCampaignTitle || "Sondage"}`,
      `Date d'export: ${new Date().toLocaleDateString("fr-FR")}`,
      "",
    ].join("\n");

    const blob = new Blob([`\ufeff${exportMeta}\n${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Liens_${selectedCompanyName || "Entreprise"}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setImportFeedback("La liste des liens a été téléchargée.");
  }

  function handleImportEmployees() {
    if (!campaignId || !companyId) {
      setImportError("Enregistrez d'abord le sondage avant d'importer les employés.");
      return;
    }

    if (!importCsv.trim()) {
      setImportError("Le fichier CSV est vide. Veuillez ajouter des données.");
      return;
    }

    const validation = validateImportCsv();
    if (!validation.valid) {
      setImportError(`Format CSV invalide. ${validation.errors.length} erreur(s) détectée(s).`);
      return;
    }

    if (validation.lineCount === 0) {
      setImportError("Aucune donnée à importer. Ajoutez au moins un employé.");
      return;
    }

    setImportError(null);
    setImportFeedback(null);

    startTransition(async () => {
      try {
        const rawResult = await getTrpcClient().campaignParticipants.importEmployees.mutate({
          campaignId,
          companyId,
          csv: importCsv,
        });
        const result = rawResult as ImportEmployeesResponse;
        const participants = (result.participants ?? []).map((participant) => {
          const firstName = participant.employee?.first_name || participant.first_name || "";
          const lastName = participant.employee?.last_name || participant.last_name || "";
          const email = participant.employee?.email || participant.email || "";
          const token = participant.participation_token || participant.token || "";

          return {
            name: `${firstName} ${lastName}`.trim() || "Employé",
            email,
            link: `${window.location.origin}/survey-response/${token}`,
          };
        });

        setImportSuccess({
          count: result.imported_employees || 0,
          participants,
        });
        setImportFeedback("Import terminé. Vous pouvez maintenant télécharger la liste des employés avec leurs liens respectifs.");
        router.refresh();
      } catch (caughtError) {
        setImportError(
          caughtError instanceof Error
            ? caughtError.message
            : "L'import a échoué. Vérifiez le fichier et réessayez.",
        );
      }
    });
  }

  function addQuestion(type: "scale" | "choice" | "text") {
    if (!canEditQuestions) {
      setError("Impossible d'ajouter des questions quand le sondage est actif.");
      return;
    }

    if (!campaignId) {
      setError("Le sondage doit exister avant d'ajouter des questions.");
      return;
    }

    const template = ensureQuestionOptions(templateByType[type]);
    const temporaryId = `tmp-${Date.now()}`;

    runMutation<{ id: number }>(
      () =>
        getTrpcClient().adminSurveys.createQuestion.mutate({
          campaignId,
          title: template.title,
          type,
          options: template.options,
          orderIndex: questions.length,
        }),
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

    const trimmedQuestionTitle = question.title.trim();
    if (trimmedQuestionTitle.length < 5) {
      setError("Le texte de la question doit contenir au moins 5 caracteres.");
      return;
    }

    const sanitizedOptions = sanitizeOptions(question.options);

    if (question.type === "choice" && sanitizedOptions.length < 2) {
      setError("Ajoute au moins deux choix pour un QCM.");
      return;
    }

    runMutation(
      () =>
        getTrpcClient().adminSurveys.updateQuestion.mutate({
          questionId: Number(question.id),
          title: trimmedQuestionTitle,
          type: question.type,
          options: question.type === "choice" ? sanitizedOptions : undefined,
          orderIndex: index,
        }),
      "Question mise a jour.",
    );
  }

  function removeQuestion(question: SurveyQuestion) {
    if (!Number.isFinite(Number(question.id))) {
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      return;
    }

    runMutation(
      () =>
        getTrpcClient().adminSurveys.deleteQuestion.mutate({
          questionId: Number(question.id),
        }),
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
      () =>
        getTrpcClient().adminSurveys.reorderQuestions.mutate({
          campaignId,
          items: reorderableItems.map((question) => ({
            questionId: Number(question.id),
            orderIndex: question.orderIndex,
          })),
        }),
      "Ordre des questions mis a jour.",
    );
  }

  function changeCampaignStatus(action: "activateCampaign" | "terminateCampaign" | "archiveCampaign") {
    if (!campaignId) {
      setError("Aucun sondage actif n'est disponible.");
      return;
    }

    if (action === "activateCampaign") {
      if (!canSaveCampaign) {
        setError("Corrige les informations du sondage avant activation.");
        return;
      }
      if (questions.length === 0) {
        setError("Ajoute au moins une question avant d'activer le sondage.");
        return;
      }
    }

    const successMessage =
      action === "activateCampaign"
        ? "Sondage activé."
        : action === "terminateCampaign"
          ? "Sondage désactivé."
          : "Sondage archivé.";

    runMutation<{ status?: string }>(
      () => {
        if (action === "activateCampaign") {
          return getTrpcClient().adminSurveys.activateCampaign.mutate({ campaignId });
        }

        if (action === "terminateCampaign") {
          return getTrpcClient().adminSurveys.terminateCampaign.mutate({ campaignId });
        }

        return getTrpcClient().adminSurveys.archiveCampaign.mutate({ campaignId });
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
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Guide utilisateur
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-bold text-slate-900">
              1. Créer le sondage, 2. Importer les employés, 3. Télécharger la liste des employés avec leurs liens
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              L&apos;utilisateur prépare d&apos;abord le questionnaire du sondage, ouvre ensuite le modal d&apos;import
              sans quitter la page, puis télécharge la liste des employés avec leurs liens respectifs.
            </p>
          </div>
          <Pill tone={importSuccess ? "success" : campaignId ? "warning" : "neutral"}>
            {importSuccess ? "Parcours complété" : campaignId ? "Étape 2 en cours" : "Étape 1 en cours"}
          </Pill>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[
            {
              step: 1,
              title: "Créer le sondage",
              body: "Choisissez l'entreprise, les dates et enregistrez le sondage avant de passer à l'import.",
              done: Boolean(campaignId),
            },
            {
              step: 2,
              title: "Importer les employés",
              body: "Chargez votre fichier Excel ou CSV directement dans le modal, sans changer de page.",
              done: Boolean(importSuccess),
            },
            {
              step: 3,
              title: "Télécharger la liste",
              body: "Une fois l'import terminé, téléchargez la liste des employés avec leurs liens respectifs.",
              done: Boolean(importSuccess?.participants.length),
            },
          ].map((item) => (
            <div
              key={item.step}
              className={`rounded-[16px] border p-5 ${
                item.done ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-900">
                  {item.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.done ? "Terminé" : "En attente"}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Pill>{status}</Pill>
          {campaignId ? <Pill tone="neutral">Sondage #{campaignId}</Pill> : <Pill tone="neutral">Nouveau sondage</Pill>}
          <Pill tone="neutral">{questions.length} questions</Pill>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Bloc 1: Entreprise */}
          <div className="relative rounded-[16px] border border-slate-200 bg-slate-50 p-5">
            <span className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700">
              1
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Entreprise</p>
            <p className="mt-2 text-sm text-slate-500">nom de l&apos;entreprise</p>
            <select
              value={companyId ?? ""}
              onChange={(event) => handleCompanySelection(Number(event.target.value))}
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
            {isCreateMode && (
              <div className="mt-3 flex gap-2">
                <input
                  value={newCompanyName}
                  onChange={(event) => setNewCompanyName(event.target.value)}
                  className="flex-1 rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-sm outline-none"
                  placeholder="Ajouter une nouvelle entreprise"
                />
                <SecondaryButton
                  disabled={
                    isPending ||
                    newCompanyName.trim().length < 2 ||
                    newCompanyName.trim().length > 150
                  }
                  onClick={createCompany}
                  className="px-4 py-2"
                >
                  Créer
                </SecondaryButton>
              </div>
            )}
          </div>

          {/* Bloc 2: Calendrier */}
          <div className="relative rounded-[16px] border border-slate-200 bg-white p-5">
            <span className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700">
              2
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Calendrier</p>
            <div className="mt-3 space-y-3">
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
            {isDateRangeInvalid && (
              <p className="mt-2 text-sm font-medium text-rose-700">
                La date de fin doit etre posterieure ou egale a la date de debut.
              </p>
            )}
          </div>

          {/* Bloc 3: Sondage */}
          <div className="relative rounded-[16px] border border-slate-200 bg-white p-5">
            <span className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700">
              3
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Sondage</p>
            <input
              className="mt-3 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              value={effectiveCampaignTitle}
              readOnly
              placeholder="Le titre reprend le nom de l'entreprise"
            />
            <textarea
              className="mt-3 min-h-24 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description du sondage"
            />
          </div>

          {/* Bloc 4: Import et liens */}
          <div className="relative rounded-[16px] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#f7f3eb_100%)] p-5">
            <span className="absolute -left-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700">
              4
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Import et liens
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Importez les employes dans un modal sans quitter cette page, puis recuperez leurs
              liens personnalises juste apres l&apos;import.
            </p>
            <button
              type="button"
              onClick={openImportModal}
              disabled={!isSurveyReadyForImport || isPending}
              className="mt-4 inline-flex items-center justify-center rounded-[12px] bg-[#181818] px-6 py-2 text-sm font-semibold transition hover:bg-[#242424] disabled:opacity-60"
              style={{ color: "#ffffff" }}
            >
              Importer les employes
            </button>
            <p className="mt-3 text-xs text-slate-500">
              {isSurveyReadyForImport
                ? "Le sondage reste ouvert pendant l'import et les liens sont generes a la fin."
                : "Enregistrez d'abord le sondage pour activer l'import des employes."}
            </p>
            {importSuccess ? (
              <div className="mt-4 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-800">
                  {importSuccess.count} employe(s) importe(s), liens personnalises prets.
                </p>
              </div>
            ) : null}
            <p className="mt-3 text-xs text-slate-500">amène à la page gestion des employés</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <PrimaryButton
            disabled={isPending || !canSaveCampaign || (mode === "edit" && !campaignId)}
            onClick={saveCampaign}
          >
            {isPending ? "Enregistrement..." : campaignId ? "Ajout section" : "Creer le sondage"}
          </PrimaryButton>
          {status === "active" ? (
            <SecondaryButton 
              disabled={isPending || !campaignId} 
              onClick={() => changeCampaignStatus("terminateCampaign")}
              className="bg-red-700 hover:bg-red-800 text-white"
            >
              Désactiver
            </SecondaryButton>
          ) : (
            <SecondaryButton
              disabled={isPending || !campaignId || !canSaveCampaign || questions.length === 0}
              onClick={() => changeCampaignStatus("activateCampaign")}
            >
              Activer
            </SecondaryButton>
          )}
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

        {feedback && <p className="mt-4 text-sm font-medium text-emerald-700">{feedback}</p>}
        {error && <p className="mt-4 text-sm font-medium text-rose-700">{error}</p>}
        {!canEditQuestions && (
          <p className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Le sondage est actif. Les questions ne peuvent plus etre modifiees tant qu&apos;il reste actif.
          </p>
        )}

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
                <option value="scale">Echelle 1 a 5</option>
                <option value="choice">QCM</option>
                <option value="text">Texte libre</option>
              </select>

              {question.type === "scale" && (
                <div className="mt-4 rounded-[14px] border border-sky-200 bg-sky-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                    Lecture de l&apos;echelle
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Le repondant choisit une note de 1 a 5 pour indiquer son niveau d&apos;accord.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-5">
                    {scaleAnswerGuide.map((item) => (
                      <div
                        key={`scale-guide-${item.value}`}
                        className="rounded-[12px] border border-sky-200 bg-white px-3 py-3 text-center"
                      >
                        <p className="text-base font-bold text-sky-800">{item.value}</p>
                        <p className="mt-1 text-xs text-slate-600">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {question.type === "choice" && (
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
              )}

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
          <p className="text-sm text-slate-300">Aperçu du sondage</p>
          <h3 className="mt-1 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Apercu du questionnaire
          </h3>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              Sondage
            </p>
            <p className="mt-2 text-lg font-semibold">
              {effectiveCampaignTitle || "Entreprise a definir"}
            </p>
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
                  ? "Reponse attendue sur une echelle de 1 a 5, de pas du tout d&apos;accord a tout a fait d&apos;accord."
                  : question.type === "choice"
                    ? "Selection d'un choix parmi les options ci-dessous."
                    : "Champ libre pour commentaire qualitatif."}
              </p>
              {question.type === "scale" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-5">
                  {scaleAnswerGuide.map((item) => (
                    <div
                      key={`${question.id}-scale-preview-${item.value}`}
                      className="rounded-[12px] border border-sky-200 bg-sky-50/60 px-3 py-2 text-center"
                    >
                      <p className="text-sm font-bold text-sky-800">{item.value}</p>
                      <p className="mt-1 text-[11px] text-slate-600">{item.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {question.type === "choice" && (
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
              )}
            </div>
          ))}
        </div>
      </Card>

      {isImportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[24px] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                  Import des employes
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-bold text-slate-900">
                  {effectiveCampaignTitle || "Sondage"} - {selectedCompanyName || "Entreprise"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Étape 2 : importez les employes. Étape 3 : téléchargez la liste des employés
                  avec leurs liens respectifs générés pour ce sondage.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="rounded-[12px] border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="grid gap-4 lg:grid-cols-3">
                {[
                  {
                    step: 1,
                    title: "Sondage créé",
                    body: "Le sondage est enregistré et prêt à recevoir les employés.",
                    done: Boolean(campaignId),
                  },
                  {
                    step: 2,
                    title: "Importer les employés",
                    body: "Chargez votre fichier Excel ou CSV dans la zone ci-dessous.",
                    done: Boolean(importSuccess),
                  },
                  {
                    step: 3,
                    title: "Télécharger la liste",
                    body: "Téléchargez la liste des employés avec leurs liens respectifs une fois l'import validé.",
                    done: Boolean(importSuccess?.participants.length),
                  },
                ].map((item) => (
                  <div
                    key={`modal-step-${item.step}`}
                    className={`rounded-[16px] border p-4 ${
                      item.done ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-900">
                        {item.step}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.done ? "Terminé" : "En cours"}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                ))}
              </div>

              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  Fichier source
                </p>
                <div className="mt-4 rounded-[12px] border border-dashed border-slate-300 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Import direct depuis Excel</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Formats acceptés : .xlsx, .xls, .csv
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-[12px] border border-slate-200 bg-[#181818] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#242424]">
                      Choisir un fichier
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.txt"
                        className="hidden"
                        onChange={handleImportFileChange}
                      />
                    </label>
                  </div>
                  {selectedFileName ? (
                    <p className="mt-3 text-xs text-slate-500">Fichier sélectionné : {selectedFileName}</p>
                  ) : null}
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Données CSV</label>
                    {importCsv.trim() ? (
                      <button
                        type="button"
                        onClick={validateImportCsv}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                      >
                        Valider le format
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    value={importCsv}
                    onChange={(event) => {
                      setImportCsv(event.target.value);
                      setImportValidationErrors([]);
                    }}
                    className="mt-2 min-h-40 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none font-mono"
                    placeholder="Nom,Prenom,Adresse courriel,Fonction"
                  />
                </div>

                {importValidationErrors.length > 0 ? (
                  <div className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-800">
                      {importValidationErrors.length} erreur(s) détectée(s)
                    </p>
                    <ul className="mt-2 space-y-1">
                      {importValidationErrors.map((validationError, index) => (
                        <li key={`validation-${index}`} className="text-xs text-amber-700">
                          • {validationError}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {importFeedback ? (
                  <div className="mt-4 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="text-sm font-medium text-emerald-700">{importFeedback}</p>
                  </div>
                ) : null}
                {importError ? (
                  <div className="mt-4 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-sm font-medium text-rose-700">{importError}</p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <PrimaryButton
                    disabled={isPending || !importCsv.trim() || importValidationErrors.length > 0}
                    onClick={handleImportEmployees}
                  >
                    {isPending ? "Import en cours..." : "Importer et preparer la liste avec les liens"}
                  </PrimaryButton>
                  <SecondaryButton onClick={closeImportModal} disabled={isPending}>
                    Fermer le modal
                  </SecondaryButton>
                </div>
              </Card>

              {importSuccess ? (
                <Card className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    Liste des employés et liens
                  </p>
                  <h4 className="mt-2 text-lg font-bold text-slate-900">
                    {importSuccess.count} employé(s) importé(s)
                  </h4>
                  <p className="mt-2 text-sm text-slate-600">
                    Étape 3 : téléchargez maintenant la liste des employés avec leurs liens respectifs.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <PrimaryButton onClick={downloadLinksList}>
                      Télécharger la liste des employés avec leurs liens
                    </PrimaryButton>
                    <SecondaryButton onClick={copyAllLinks}>Copier tous les liens</SecondaryButton>
                  </div>
                  <div className="mt-5 max-h-72 space-y-3 overflow-y-auto">
                    {importSuccess.participants.map((participant, index) => (
                      <div
                        key={`participant-link-${index}`}
                        className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{participant.name}</p>
                          <p className="text-xs text-slate-500">{participant.email}</p>
                        </div>
                        <code className="block flex-1 truncate text-xs text-slate-600">
                          {participant.link}
                        </code>
                        <SecondaryButton
                          className="px-4 py-2"
                          onClick={() =>
                            copyToClipboard(participant.link).then(() => {
                              setImportFeedback(`Lien copié pour ${participant.name}.`);
                            })
                          }
                        >
                          Copier
                        </SecondaryButton>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sanitizeOptions(options?: string[]) {
  return (options ?? []).map((option) => option.trim()).filter(Boolean);
}

function normalizeCsv(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function validateCsvFormat(rawCsv: string): { valid: boolean; errors: string[]; lineCount: number } {
  const errors: string[] = [];
  const csv = normalizeCsv(rawCsv);
  const lines = csv.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    errors.push("Le fichier est vide. Veuillez ajouter des donnees.");
    return { valid: false, errors, lineCount: 0 };
  }

  if (lines.length < 2) {
    errors.push("Le CSV doit contenir un en-tete et au moins une ligne de donnees.");
    return { valid: false, errors, lineCount: 0 };
  }

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const requiredHeaders = ["nom", "prenom", "adresse courriel", "fonction"];
  const missingHeaders = requiredHeaders.filter((required) => !headers.some((header) => header.includes(required)));

  if (missingHeaders.length > 0) {
    errors.push(`Colonnes manquantes : ${missingHeaders.join(", ")}`);
  }

  const emailIndex = headers.findIndex(
    (header) => header.includes("adresse courriel") || header.includes("courriel") || header.includes("email"),
  );

  if (emailIndex === -1) {
    errors.push("Colonne Adresse courriel non trouvee.");
  }

  let validEmails = 0;

  for (let index = 1; index < lines.length; index += 1) {
    const values = lines[index].split(",").map((value) => value.trim());

    if (values.length < headers.length) {
      errors.push(`Ligne ${index + 1}: nombre de colonnes insuffisant.`);
      continue;
    }

    if (emailIndex >= 0) {
      const email = values[emailIndex];
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`Ligne ${index + 1}: email invalide "${email}"`);
      } else {
        validEmails += 1;
      }
    }
  }

  return {
    valid: errors.length === 0 && validEmails > 0,
    errors: errors.slice(0, 6),
    lineCount: lines.length - 1,
  };
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

function isEndDateBeforeStartDate(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return false;
  }

  return new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`);
}
