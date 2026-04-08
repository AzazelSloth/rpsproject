"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { Card, Pill, PrimaryButton } from "@/components/rps/ui";
import type { EmployeeManagementData } from "@/lib/repositories/rps-repository";
import { getTrpcClient } from "@/lib/trpc/client";

export function EmployeesTableDemo({
  managementData,
  companies,
  defaultCompanyId,
  defaultCampaignName,
  campaignId: propCampaignId,
  companyId: propCompanyId,
}: {
  managementData: EmployeeManagementData;
  companies: { id: number; name: string }[];
  defaultCompanyId: number | null;
  defaultCampaignName: string;
  campaignId?: number | null;
  companyId?: number | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>(
    defaultCompanyId ? String(defaultCompanyId) : "all",
  );
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "reminded">("all");
  const [csv, setCsv] = useState(
    "Nom,Prénom,Adresse courriel,Fonction\nLefebvre,Anne,anne.lefebvre@test.com,gestionnaire\nTremblay,Marc,marc.tremblay@test.com,cadre",
  );
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

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

  function buildSurveyCreateHref() {
    const params = new URLSearchParams();
    params.set("tab", "create");

    const scenario = searchParams.get("scenario");
    if (scenario) {
      params.set("scenario", scenario);
    }

    return `/surveys?${params.toString()}`;
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
        setFeedback(`Fichier chargé : ${file.name}`);
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
      setFeedback(`Fichier chargé : ${file.name}`);
    } catch {
      setError(
        "Le fichier n'a pas pu être lu. Utilise un fichier .xlsx, .xls, .csv ou colle les lignes dans la zone de texte.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function handleImport() {
    // Use props if provided, otherwise fallback to managementData
    const campaignId = propCampaignId ?? managementData.campaignId;
    const companyId = propCompanyId ?? managementData.companyId;
    
    if (!campaignId || !companyId) {
      setError("Aucun sondage actif exploitable n'est disponible. Veuillez d'abord créer un sondage.");
      return;
    }

    if (!csv.trim()) {
      setError("Le fichier CSV est vide. Veuillez ajouter des données.");
      return;
    }

    setFeedback(null);
    setError(null);
    setIsPending(true);

    getTrpcClient().campaignParticipants.importEmployees.mutate({
      campaignId,
      companyId,
      csv,
    })
      .then(() => {
        setFeedback("Import des salariés terminé avec succès !");
        setTimeout(() => {
          router.push(buildSurveyCreateHref());
        }, 1000);
      })
      .catch((err) => {
        const errorMessage = err?.message || "L'import a échoué. Vérifiez le format du CSV et réessayez.";
        setError(errorMessage);
      })
      .finally(() => {
        setIsPending(false);
      });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[3fr_1fr]">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Import sondage
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Ajouter des salariés au sondage
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Charge un fichier Excel ou colle un CSV simple pour créer les participants et générer
            leurs liens uniques. Le format attendu est : Nom, Prénom, Adresse courriel, Fonction.
          </p>

          <div className="mt-5 rounded-[12px] border border-dashed border-slate-300 bg-slate-50/80 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Import direct depuis Excel</p>
                <p className="mt-1 text-xs text-slate-500">
                  Formats acceptés : .xlsx, .xls, .csv
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
              <p className="mt-3 text-xs text-slate-500">Fichier sélectionné : {selectedFileName}</p>
            ) : null}
          </div>

          <textarea
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            className="mt-5 min-h-40 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <PrimaryButton disabled={isPending} onClick={handleImport}>
              {isPending ? "Traitement..." : "Importer dans le sondage"}
            </PrimaryButton>
          </div>
          {feedback ? <p className="mt-4 text-sm font-medium text-emerald-700">{feedback}</p> : null}
          {error ? <p className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Sélection
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
              Participants au sondage
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Liens individuels et statut de complétion.
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
              <option value="completed">Complétés</option>
              <option value="pending">En attente</option>
              <option value="reminded">Relancés</option>
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
                        Relance : {formatShortDate(participant.reminderSentAt)}
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
