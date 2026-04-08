"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { Card, Pill, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import type { EmployeeManagementData } from "@/lib/repositories/rps-repository";
import { getTrpcClient } from "@/lib/trpc/client";

export function EmployeesTableDemo({
  managementData,
  companies,
  defaultCompanyId,
  defaultCampaignName,
}: {
  managementData: EmployeeManagementData;
  companies: { id: number; name: string }[];
  defaultCompanyId: number | null;
  defaultCampaignName: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(
    defaultCompanyId ? String(defaultCompanyId) : "all",
  );
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "reminded">("all");
  const [csv, setCsv] = useState(
    "Nom,Prenom,Adresse courriel,Fonction\nLefebvre,Anne,anne.lefebvre@test.com,gestionnaire\nTremblay,Marc,marc.tremblay@test.com,cadre",
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredParticipants = useMemo(() => {
    return managementData.participants.filter((participant) => {
      const haystack = `${participant.name} ${participant.email} ${participant.department}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesFilter = filter === "all" || participant.status === filter;
      const matchesCompany =
        companyFilter === "all" ||
        (managementData.companyId !== null && String(managementData.companyId) === companyFilter);

      return matchesQuery && matchesFilter && matchesCompany;
    });
  }, [companyFilter, filter, managementData.companyId, managementData.participants, query]);

  function runAdminAction(action: () => Promise<unknown>, successMessage: string) {
    setFeedback(null);
    setError(null);

    startTransition(async () => {
      try {
        await action();

        setFeedback(successMessage);
        router.refresh();
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "L'action admin a echoue. Verifie la configuration de l'API.";
        setError(message);
      }
    });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setFeedback(null);
    setSelectedFileName(file.name);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv" || extension === "txt") {
        const text = await file.text();
        setCsv(normalizeCsv(text));
        setFeedback(`Fichier charge: ${file.name}`);
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

      setCsv(normalizeCsv(parsedCsv));
      setFeedback(`Fichier charge: ${file.name}`);
    } catch {
      setError(
        "Le fichier n'a pas pu etre lu. Utilise un fichier .xlsx, .xls, .csv ou colle les lignes dans la zone de texte.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function handleImport() {
    if (!managementData.campaignId || !managementData.companyId) {
      setError("Aucune campagne active exploitable n'est disponible.");
      return;
    }

    const campaignId = managementData.campaignId;
    const companyId = managementData.companyId;

    runAdminAction(
      () =>
        getTrpcClient().campaignParticipants.importEmployees.mutate({
          campaignId,
          companyId,
          csv,
        }),
      "Import des salaries termine.",
    );
  }

  function handleRemind(force = false) {
    if (!managementData.campaignId) {
      setError("Aucune campagne active exploitable n'est disponible.");
      return;
    }

    const campaignId = managementData.campaignId;

    runAdminAction(
      () =>
        getTrpcClient().campaignParticipants.remind.mutate({
          campaignId,
          minimumDaysSinceInvitation: 3,
          force,
        }),
      force ? "Relance forcee envoyee." : "Relance des non-repondants terminee.",
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Campagne active", managementData.campaignName],
          ["Participation", `${managementData.participationRate}%`],
          ["Invites", String(managementData.totalParticipants)],
          ["Completes", String(managementData.completedParticipants)],
          ["A relancer", String(managementData.pendingParticipants)],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 font-[family-name:var(--font-manrope)] text-2xl font-extrabold">
              {value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[3fr_1fr]">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Import campagne
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Ajouter des salaries a la campagne
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Charge un fichier Excel ou colle un CSV simple pour creer les participants et generer
            leurs liens uniques. Le format attendu est: Nom, Prenom, Adresse courriel, Fonction.
          </p>

          <div className="mt-5 rounded-[12px] border border-dashed border-slate-300 bg-slate-50/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Import direct depuis Excel</p>
                <p className="mt-1 text-xs text-slate-500">
                  Formats acceptes: .xlsx, .xls, .csv
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-slate-900">
                Choisir un fichier
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {selectedFileName ? (
              <p className="mt-3 text-xs text-slate-500">Fichier selectionne: {selectedFileName}</p>
            ) : null}
          </div>

          <textarea
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            className="mt-5 min-h-40 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton disabled={isPending} onClick={handleImport}>
              {isPending ? "Traitement..." : "Importer dans la campagne"}
            </PrimaryButton>
            <SecondaryButton disabled={isPending} onClick={() => handleRemind(false)}>
              Relancer les en attente
            </SecondaryButton>
          </div>
          {feedback ? <p className="mt-4 text-sm font-medium text-emerald-700">{feedback}</p> : null}
          {error ? <p className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Selection
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Entreprise et sondage
          </h3>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm text-slate-500">Entreprise</p>
              <select
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="all">Toutes les entreprises</option>
                {companies.map((company) => (
                  <option key={company.id} value={String(company.id)}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm text-slate-500">Sondage</p>
              <select
                value={defaultCampaignName}
                onChange={() => null}
                className="mt-2 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value={defaultCampaignName}>{defaultCampaignName}</option>
              </select>
            </div>
            <div className="rounded-[12px] bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Statut</p>
              <p className="mt-2 text-lg font-bold capitalize">{managementData.campaignStatus}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-manrope)] text-xl font-bold">
              Participants a la campagne
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Liens individuels, statut de completion et relances.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un participant"
              className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            />
            <select
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value)}
              className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="all">Toutes les entreprises</option>
              {companies.map((company) => (
                <option key={company.id} value={String(company.id)}>
                  {company.name}
                </option>
              ))}
            </select>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as "all" | "completed" | "pending" | "reminded")
              }
              className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="all">Tous</option>
              <option value="completed">Completes</option>
              <option value="pending">En attente</option>
              <option value="reminded">Relances</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Participant</th>
                <th className="px-6 py-4">Fonction</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Invitation</th>
                <th className="px-6 py-4">Lien sondage</th>
              </tr>
            </thead>
            <tbody>
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="border-t border-slate-100 align-top">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{participant.name}</p>
                    <p className="mt-1 text-slate-600">{participant.email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{participant.department}</td>
                  <td className="px-6 py-4">
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
                        {participant.status}
                      </Pill>
                      <span className="text-xs text-slate-500">{participant.responseStatus}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <p>{formatShortDate(participant.invitationSentAt)}</p>
                    {participant.reminderSentAt ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Relance: {formatShortDate(participant.reminderSentAt)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={participant.surveyUrl}
                        className="text-sm font-semibold text-amber-700 underline-offset-4 hover:underline"
                      >
                        Ouvrir le lien
                      </Link>
                      <code className="max-w-[24rem] truncate text-xs text-slate-500">
                        {participant.participationToken}
                      </code>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function normalizeCsv(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
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
