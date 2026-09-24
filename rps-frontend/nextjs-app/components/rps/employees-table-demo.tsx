"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  Info,
} from "lucide-react";
import { Card, Pill } from "@/components/rps/ui";
import { ConfirmationModal } from "@/components/rps/confirmation-modal";
import { appFetch } from "@/lib/api";
import type {
  EmployeeManagementData,
  SurveyOption,
} from "@/lib/repositories/rps-repository";
import { formatTrpcError, getTrpcClient } from "@/lib/trpc/client";

type RemindResponse =
  | {
      reminded?: number;
      reminded_count?: number;
      remindedParticipants?: number;
      count?: number;
      failed_count?: number;
      success?: boolean;
      message?: string;
      result?: RemindResponse;
      sendgrid_result?: {
        failed?: RemindFailure[];
      };
    }
  | undefined;

type RemindFailure = {
  email?: string;
  error?: string;
  status_code?: number;
  reason?: SendGridFailureReason;
  retry_after?: string;
  rate_limit?: SendGridRateLimit;
};

type SendGridFailureReason =
  | "quota_exceeded"
  | "rate_limited"
  | "forbidden"
  | "authentication"
  | "invalid_request"
  | "server_error"
  | "unknown";

type SendGridRateLimit = {
  limit?: number;
  remaining?: number;
  reset?: number;
};

export function EmployeesTableDemo({
  managementData,
  companies,
  surveys,
  defaultCompanyId,
  defaultCampaignId,
  defaultCampaignName,
  campaignId: propCampaignId,
  companyId: propCompanyId,
}: {
  managementData: EmployeeManagementData;
  companies: { id: number; name: string }[];
  surveys: SurveyOption[];
  defaultCompanyId: number | null;
  defaultCampaignId: number | null;
  defaultCampaignName: string;
  campaignId?: number | null;
  companyId?: number | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    defaultCompanyId ? String(defaultCompanyId) : (companies[0] ? String(companies[0].id) : ""),
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    defaultCampaignId ? String(defaultCampaignId) : "",
  );
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress" | "pending" | "reminded">("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [manualReminderConfirmation, setManualReminderConfirmation] = useState<{
    campaignId: number;
    companyId: number;
    pendingCount: number;
  } | null>(null);
  const [surveyDetails, setSurveyDetails] = useState<any>(null);
  const [surveyDetailsError, setSurveyDetailsError] = useState<string | null>(null);
  const [loadingSurveyDetails, setLoadingSurveyDetails] = useState(false);

  const availableSurveys = useMemo(() => {
    if (!selectedCompanyId) {
      return surveys;
    }

    return surveys.filter((survey) => String(survey.companyId) === selectedCompanyId);
  }, [selectedCompanyId, surveys]);

  const selectedSurvey =
    surveys.find((survey) => String(survey.id) === selectedCampaignId) ??
    availableSurveys[0] ??
    null;
  const selectedSurveyTitle = selectedSurvey
    ? formatSurveyDisplayTitle(selectedSurvey.title, selectedSurvey.createdAt)
    : defaultCampaignName;
  const lockedCompanyId =
    selectedSurvey?.companyId ? String(selectedSurvey.companyId) : selectedCompanyId;
  const hasCompanyMismatch = Boolean(
    selectedSurvey?.companyId &&
      selectedCompanyId &&
      String(selectedSurvey.companyId) !== selectedCompanyId,
  );
  const surveyDetailsTitle = formatSurveyDisplayTitle(
    surveyDetails?.name ?? surveyDetails?.title ?? selectedSurveyTitle,
    surveyDetails?.created_at ?? surveyDetails?.createdAt ?? selectedSurvey?.createdAt,
  );
  const pendingParticipantsCount = managementData.participants.filter(
    (participant) => participant.status !== "completed",
  ).length;

  const filteredParticipants = useMemo(() => {
    return managementData.participants.filter((participant) => {
      const haystack =
        `${participant.name} ${participant.email} ${participant.department}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesFilter = filter === "all" || participant.status === filter;
      const matchesCompany =
        !lockedCompanyId ||
        (managementData.companyId !== null && String(managementData.companyId) === lockedCompanyId);

      return matchesQuery && matchesFilter && matchesCompany;
    });
  }, [filter, lockedCompanyId, managementData.companyId, managementData.participants, query]);

  function pushSelection(nextCompanyId: string, nextCampaignId: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextCompanyId) {
      params.set("companyId", nextCompanyId);
    } else {
      params.delete("companyId");
    }

    if (nextCampaignId) {
      params.set("campaignId", nextCampaignId);
    } else {
      params.delete("campaignId");
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  function handleSurveySelection(nextCampaignId: string) {
    setSelectedCampaignId(nextCampaignId);

    const nextSurvey = surveys.find((survey) => String(survey.id) === nextCampaignId) ?? null;
    const nextCompanyId = nextSurvey?.companyId ? String(nextSurvey.companyId) : "";

    if (nextCompanyId && nextCompanyId !== selectedCompanyId) {
      setSelectedCompanyId(nextCompanyId);
    }

    pushSelection(nextCompanyId, nextCampaignId);
  }

  function resolveCampaignId() {
    if (selectedCampaignId) {
      return Number(selectedCampaignId);
    }

    if (selectedSurvey?.id) {
      return selectedSurvey.id;
    }

    return propCampaignId ?? managementData.campaignId;
  }

  function resolveCompanyId() {
    if (lockedCompanyId) {
      return Number(lockedCompanyId);
    }

    if (selectedSurvey?.companyId) {
      return selectedSurvey.companyId;
    }

    return propCompanyId ?? managementData.companyId;
  }

  const reminderCampaignId = resolveCampaignId();
  const reminderCompanyId = resolveCompanyId();
  const reminderSurvey =
    surveys.find((survey) => survey.id === reminderCampaignId) ?? selectedSurvey;
  const isReminderSelectionLoaded =
    !reminderCampaignId || managementData.campaignId === reminderCampaignId;
  const canRemindSelectedSurvey = Boolean(
    reminderCampaignId &&
      reminderCompanyId &&
      !hasCompanyMismatch &&
      isReminderSelectionLoaded,
  );

  // Fetch survey details when campaign changes
  useEffect(() => {
    const campaignId = resolveCampaignId();

    if (!campaignId) {
      setSurveyDetails(null);
      setSurveyDetailsError(null);
      return;
    }

    const fetchSurveyDetails = async () => {
      setLoadingSurveyDetails(true);
      setSurveyDetailsError(null);
      try {
        const details = await getTrpcClient().adminSurveys.campaigns.findOne.query(campaignId);
        setSurveyDetails(details);
      } catch (err) {
        setSurveyDetails(null);
        const message = formatTrpcError(err);

        if (/404|not found|introuvable/i.test(message)) {
          setSurveyDetailsError("Le sondage selectionne est introuvable ou a ete supprime.");
        } else if (/backend unavailable|fetch failed|network|ECONNREFUSED|ENOTFOUND/i.test(message)) {
          setSurveyDetailsError("Le backend est indisponible pour charger le detail du sondage.");
        } else if (/not configured|PRECONDITION_FAILED/i.test(message)) {
          setSurveyDetailsError("Le backend n'est pas configure pour charger le detail du sondage.");
        } else {
          setSurveyDetailsError(message || "Une erreur est survenue lors du chargement du sondage.");
        }
      } finally {
        setLoadingSurveyDetails(false);
      }
    };

    fetchSurveyDetails();
  }, [selectedCampaignId, surveys]);

  async function handleRemindPending() {
    const campaignId = reminderCampaignId;
    const companyId = reminderCompanyId;

    if (!campaignId || !companyId) {
      setError("Sélectionnez une entreprise et un sondage valides pour procéder.");
      return;
    }

    if (reminderSurvey?.companyId && companyId !== reminderSurvey.companyId) {
      setError("L’entreprise choisie ne correspond pas au sondage sélectionné.");
      return;
    }

    if (!isReminderSelectionLoaded) {
      setError("Le sondage sélectionné est en cours de chargement. Réessayez dans un instant.");
      return;
    }

    const pendingCount = managementData.participants.filter(
      (participant) => participant.status !== "completed",
    ).length;

    if (pendingCount === 0) {
      setFeedback("Aucun employé en attente de réponse.");
      return;
    }

    setManualReminderConfirmation({ campaignId, companyId, pendingCount });
  }

  async function sendManualReminderConfirmed() {
    if (!manualReminderConfirmation) {
      return;
    }

    const { campaignId, companyId } = manualReminderConfirmation;
    setManualReminderConfirmation(null);

    setError(null);
    setFeedback(null);
    setIsPending(true);

    try {
      const directResult = (await getTrpcClient().campaignParticipants.remind.mutate({
        campaignId,
        force: true,
      })) as RemindResponse;
      const directPayload = unwrapRemindResult(directResult);
      const remindedCount = extractRemindedCount(directPayload) ?? 0;
      const failedCount = directPayload?.failed_count ?? 0;

      if (failedCount > 0 && remindedCount === 0) {
        setError(formatRemindFailureMessage(directPayload));
        return;
      }

      setFeedback(`Relance envoyée à ${remindedCount} employé(s).`);
      if (failedCount > 0) {
        setError(`Certaines relances ont échoué. ${formatRemindFailureMessage(directPayload)}`);
      }
      router.refresh();
    } catch {
      try {
        const response = await appFetch("/admin/campaign-participants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "remind",
            campaignId,
            companyId,
            force: true,
          }),
        });

        if (!response.ok) {
          throw new Error("Échec de l'appel à n8n");
        }

        const fallbackResult = (await response.json()) as RemindResponse;
        const fallbackPayload = unwrapRemindResult(fallbackResult);
        const remindedCount = extractRemindedCount(fallbackPayload) ?? 0;
        const failedCount = fallbackPayload?.failed_count ?? 0;

        if (failedCount > 0 && remindedCount === 0) {
          setError(formatRemindFailureMessage(fallbackPayload));
          return;
        }

        setFeedback(`Relance envoyée à ${remindedCount} employé(s).`);
        if (failedCount > 0) {
          setError(`Certaines relances ont échoué. ${formatRemindFailureMessage(fallbackPayload)}`);
        }
      } catch {
        setError("La relance a échoué. Vérifiez la configuration n8n.");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmationModal
        open={manualReminderConfirmation !== null}
        eyebrow="Relance manuelle"
        title="Forcer l’envoi des courriels de relance ?"
        confirmLabel="Forcer la relance"
        pendingLabel="Envoi..."
        pending={isPending}
        onCancel={() => setManualReminderConfirmation(null)}
        onConfirm={() => void sendManualReminderConfirmed()}
      >
        <p>
          Êtes-vous sûr de vouloir envoyer immédiatement un courriel de relance aux employés qui n’ont pas encore répondu ?
        </p>
        <div className="mt-4 rounded-[14px] border border-line bg-white px-5 py-4">
          <p className="font-bold text-graphite">{selectedSurveyTitle || "Sondage"}</p>
          <p className="mt-1 text-sm text-muted">
            Entreprise :{" "}
            <strong className="text-graphite">
              {companies.find(
                (company) => company.id === manualReminderConfirmation?.companyId,
              )?.name ?? "Entreprise"}
            </strong>
          </p>
          <p className="mt-1 text-sm text-muted">
            Participants à relancer :{" "}
            <strong className="text-graphite">
              {manualReminderConfirmation?.pendingCount ?? 0}
            </strong>
          </p>
        </div>
        <p className="mt-4 text-sm font-medium text-accent">
          Cette action force la relance sans attendre le délai automatique habituel.
        </p>
      </ConfirmationModal>

      <div className="grid gap-5">
        <Card className="p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Suivi du sondage
          </p>
          <h3 className="mt-2 font-heading text-lg sm:text-xl font-bold">
            Gestion des participants
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Sélectionnez un sondage pour consulter les participants, suivre leur statut et ouvrir
            leurs liens individuels.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-graphite">
                <Building2 className="h-4 w-4 text-accent" />
                Entreprise
              </p>
              <div className="relative">
                <select
                  value={selectedCompanyId}
                  onChange={(event) => {
                    setSelectedCompanyId(event.target.value);
                    const companySurveys = surveys.filter(
                      (survey) => String(survey.companyId) === event.target.value
                    );
                    if (companySurveys.length > 0) {
                      handleSurveySelection(String(companySurveys[0].id));
                    } else {
                      setSelectedCampaignId("");
                      pushSelection(event.target.value, "");
                    }
                  }}
                  className="w-full appearance-none rounded-xl border-2 border-line bg-white px-4 py-3 pr-10 text-sm font-medium text-graphite outline-none transition-all duration-200 hover:border-accent-bright hover:shadow-sm focus:border-accent-bright focus:ring-2 focus:ring-line"
                >
                  <option value="">-- Choisir une entreprise --</option>
                  {companies.map((company) => {
                    const companySurveys = surveys.filter(
                      (survey) => survey.companyId === company.id
                    );
                    return (
                      <option key={company.id} value={String(company.id)}>
                        {company.name} {companySurveys.length > 0 ? `(${companySurveys.length} sondage${companySurveys.length > 1 ? 's' : ''})` : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronDown className="h-5 w-5 text-accent" />
                </div>
              </div>
              {lockedCompanyId && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                  <p className="text-xs text-accent">
                    Entreprise sélectionnée : <span className="font-semibold">{companies.find(c => String(c.id) === lockedCompanyId)?.name}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-graphite">
                <BarChart3 className="h-4 w-4 text-accent" />
                Sondage
              </p>
              <div className="relative">
                <select
                  value={selectedCampaignId}
                  onChange={(event) => handleSurveySelection(event.target.value)}
                  disabled={availableSurveys.length === 0}
                  className="w-full appearance-none rounded-xl border-2 border-line bg-white px-4 py-3 pr-10 text-sm font-medium text-graphite outline-none transition-all duration-200 hover:border-accent-bright hover:shadow-sm focus:border-accent-bright focus:ring-2 focus:ring-line disabled:opacity-100 disabled:bg-track disabled:text-muted disabled:cursor-not-allowed"
                >
                  {availableSurveys.length === 0 ? (
                    <option value="">Aucun sondage disponible</option>
                  ) : (
                    <>
                      <option value="">-- Choisir un sondage --</option>
                      {availableSurveys.map((survey) => (
                        <option key={survey.id} value={String(survey.id)}>
                          {survey.title}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronDown className="h-5 w-5 text-accent" />
                </div>
              </div>
              {selectedCampaignId && selectedSurvey && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-2">
                  <Info className="h-4 w-4 text-accent" />
                  <p className="text-xs text-accent">
                    Sondage sélectionné : <span className="font-semibold">{selectedSurveyTitle}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {hasCompanyMismatch ? (
            <div className="mt-4 rounded-[12px] border border-muted bg-page px-4 py-3">
              <p className="text-sm font-medium text-graphite">
                L’entreprise choisie ne correspond pas au sondage sélectionné.
              </p>
            </div>
          ) : null}

          {feedback ? (
            <div className="mt-4 rounded-[12px] border border-line bg-accent-soft px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-accent">
                <CheckCircle2 className="h-4 w-4" />
                <span>{feedback}</span>
              </p>
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-[12px] border border-muted bg-page px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-graphite">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-4 rounded-[12px] bg-page p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted">Participants à relancer</p>
              <p className="mt-2 text-2xl font-bold text-graphite">
                {isReminderSelectionLoaded ? pendingParticipantsCount : "-"}
              </p>
              <p className="mt-1 text-xs text-muted">
                Sondage sélectionné : {selectedSurveyTitle || "Aucun sondage"}
              </p>
            </div>
            <button
              onClick={handleRemindPending}
              disabled={isPending || !canRemindSelectedSurvey}
              className="rounded-[12px] bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent disabled:opacity-100 disabled:bg-track disabled:text-muted"
            >
              {isPending ? "En cours..." : "Forcer une relance manuelle"}
            </button>
          </div>
        </Card>
      </div>

      {/* Survey Details Card */}
      {selectedCampaignId && (
        <Card className="p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Détails du sondage
          </p>
          <h3 className="mt-2 font-heading text-lg sm:text-xl font-bold">
            {loadingSurveyDetails ? "Chargement..." : surveyDetailsTitle}
          </h3>
          
          {loadingSurveyDetails ? (
            <p className="mt-4 text-sm text-muted">Chargement des details...</p>
          ) : surveyDetailsError ? (
            <div className="mt-4 rounded-[12px] border border-muted bg-page px-4 py-3">
              <p className="text-sm font-medium text-graphite">{surveyDetailsError}</p>
            </div>
          ) : surveyDetails ? (
            <div className="mt-4 space-y-4">
              {/* Dates */}
              <div>
                <p className="text-xs font-semibold uppercase text-muted tracking-[0.05em]">Dates</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-[8px] bg-page p-3">
                    <p className="text-xs text-muted">Début</p>
                    <p className="mt-1 text-sm font-semibold text-graphite">
                      {surveyDetails?.start_date
                        ? new Date(surveyDetails.start_date).toLocaleDateString('fr-FR')
                        : "Non défini"}
                    </p>
                  </div>
                  <div className="rounded-[8px] bg-page p-3">
                    <p className="text-xs text-muted">Fin</p>
                    <p className="mt-1 text-sm font-semibold text-graphite">
                      {surveyDetails?.end_date
                        ? new Date(surveyDetails.end_date).toLocaleDateString('fr-FR')
                        : "Non défini"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {surveyDetails?.description && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted tracking-[0.05em]">Description</p>
                  <p className="mt-2 text-sm text-graphite leading-relaxed whitespace-pre-wrap">
                    {surveyDetails.description}
                  </p>
                </div>
              )}

              {/* Questions Count */}
              {surveyDetails?.questions && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted tracking-[0.05em]">Questions</p>
                  <div className="mt-2">
                    {surveyDetails.questions.length > 0 ? (
                      <Pill tone="neutral">
                        {surveyDetails.questions.length} question{surveyDetails.questions.length > 1 ? 's' : ''}
                      </Pill>
                    ) : (
                      <p className="text-sm text-muted">Aucune question</p>
                    )}
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <p className="text-xs font-semibold uppercase text-muted tracking-[0.05em]">Statut</p>
                <div className="mt-2">
                  <Pill tone={surveyDetails?.status === 'active' ? 'success' : 'neutral'}>
                    {formatSurveyStatusLabel(surveyDetails?.status)}
                  </Pill>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Aucun detail de sondage disponible.</p>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-line px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold">
              Participants au sondage
            </h3>
            <p className="mt-1 text-sm text-muted">
              Liens individuels et statut de complétion.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un participant"
              className="rounded-[12px] border border-line bg-white px-4 py-3 text-sm outline-none w-full sm:w-auto"
            />
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as "all" | "completed" | "in_progress" | "pending" | "reminded")
              }
              className="rounded-[12px] border border-line bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="all">Tous</option>
              <option value="completed">Complétés</option>
              <option value="pending">En attente</option>
              <option value="reminded">Relancés</option>
              <option value="in_progress">En cours</option>
            </select>
          </div>
        </div>

        {filteredParticipants.length === 0 ? (
          <div className="px-4 py-12 text-center sm:px-6">
            <p className="text-sm text-muted">Aucun participant trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-page uppercase tracking-[0.18em] text-muted">
                <tr>
                  <th className="px-4 py-4 sm:px-6">Participant</th>
                  <th className="hidden px-4 py-4 sm:px-6 md:table-cell">Fonction</th>
                  <th className="px-4 py-4 sm:px-6">Statut</th>
                  <th className="hidden px-4 py-4 sm:px-6 lg:table-cell">Invitation</th>
                  <th className="px-4 py-4 sm:px-6">Lien sondage</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="border-t border-line align-top">
                    <td className="px-4 py-4 sm:px-6">
                      <p className="font-semibold">{participant.name}</p>
                      <p className="mt-1 text-xs text-muted sm:text-sm">
                        {participant.email}
                      </p>
                    </td>
                    <td className="hidden px-4 py-4 text-muted sm:px-6 md:table-cell">
                      {participant.department}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-2">
                        <Pill
                          tone={
                            participant.status === "completed"
                              ? "success"
                              : participant.status === "reminded"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {formatParticipantStatusLabel(participant.status)}
                        </Pill>
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 text-muted sm:px-6 lg:table-cell">
                      <p className="text-xs sm:text-sm">{formatShortDate(participant.invitationSentAt)}</p>
                      {participant.reminderSentAt ? (
                        <p className="mt-1 text-xs text-accent">
                          Relance : {formatShortDate(participant.reminderSentAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={participant.surveyUrl}
                          className="text-xs font-semibold text-accent underline-offset-4 hover:underline sm:text-sm"
                        >
                          Ouvrir le lien
                        </Link>
                        <code className="max-w-[12rem] truncate text-xs text-muted sm:max-w-[24rem]">
                          {participant.participationToken}
                        </code>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function formatShortDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatSurveyDisplayTitle(title: string | null | undefined, createdAt?: string | null) {
  const trimmedTitle = title?.trim() ?? "";

  if (trimmedTitle && !isUntitledSurveyTitle(trimmedTitle)) {
    return trimmedTitle;
  }

  return `Sondage ${formatSurveyCreationDate(createdAt)}`;
}

function isUntitledSurveyTitle(title: string) {
  const normalizedTitle = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return normalizedTitle === "sondage sans titre" || normalizedTitle === "sans titre";
}

function formatSurveyCreationDate(createdAt?: string | null) {
  const creationDate = createdAt ? new Date(createdAt) : new Date();
  const safeDate = Number.isNaN(creationDate.getTime()) ? new Date() : creationDate;

  return safeDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

function extractRemindedCount(result: RemindResponse) {
  if (!result) {
    return null;
  }

  return (
    result.reminded ??
    result.reminded_count ??
    result.remindedParticipants ??
    result.count ??
    null
  );
}

function unwrapRemindResult(result: RemindResponse): RemindResponse {
  return result?.result ?? result;
}

function formatRemindFailureMessage(result: RemindResponse) {
  const baseMessage =
    result?.message?.trim() || "Aucune relance n'a pu etre envoyee via SendGrid.";
  const failures = result?.sendgrid_result?.failed ?? [];
  const diagnostic = getSendGridFailureDiagnostic(failures);
  const resolvedBaseMessage =
    diagnostic && !/quota|limite SendGrid/i.test(baseMessage)
      ? `${baseMessage} ${diagnostic}`
      : baseMessage;
  const details = failures
    .map((failure) => {
      const error = truncateMessage(failure.error?.trim() || "");

      if (!error) {
        return null;
      }

      return failure.email ? `${failure.email}: ${error}` : error;
    })
    .filter((detail): detail is string => Boolean(detail))
    .slice(0, 3);

  if (!details.length) {
    return resolvedBaseMessage;
  }

  const remainingCount = Math.max(failures.length - details.length, 0);
  const remainingMessage =
    remainingCount > 0 ? ` ${remainingCount} autre(s) echec(s).` : "";

  return `${resolvedBaseMessage} ${details.join(" ")}${remainingMessage}`;
}

function getSendGridFailureDiagnostic(failures: RemindFailure[]) {
  if (
    failures.some(
      (failure) =>
        failure.reason === "quota_exceeded" ||
        failure.reason === "rate_limited" ||
        /quota|credits?|rate.?limit|too many requests/i.test(failure.error ?? ""),
    )
  ) {
    return "Cause probable: quota ou limite SendGrid atteint.";
  }

  return "";
}

function truncateMessage(value: string, maxLength = 260) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function formatParticipantStatusLabel(value: "pending" | "in_progress" | "reminded" | "completed") {
  if (value === "in_progress") return "En cours";
  if (value === "pending") {
    return "En attente";
  }
  if (value === "completed") {
    return "Complété";
  }
  if (value === "reminded") {
    return "Relancé";
  }
  return value;
}

function formatSurveyStatusLabel(value?: string) {
  if (value === "active") {
    return "Activé";
  }
  if (value === "terminated") {
    return "Complété";
  }
  if (value === "archived") {
    return "Archivé";
  }
  return value || "inconnu";
}
