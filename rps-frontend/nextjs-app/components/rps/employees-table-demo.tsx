"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { Card, Pill, PrimaryButton } from "@/components/rps/ui";
import type { EmployeeManagementData } from "@/lib/repositories/rps-repository";
import { getTrpcClient } from "@/lib/trpc/client";

function validateCsvFormat(csv: string): { valid: boolean; errors: string[]; lineCount: number } {
  const errors: string[] = [];
  const lines = csv.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    errors.push("Le CSV doit contenir au moins un en-tête et une ligne de données.");
    return { valid: false, errors, lineCount: 0 };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['nom', 'prénom', 'adresse courriel', 'fonction'];
  const missingHeaders = requiredHeaders.filter(rh => !headers.some(h => h.includes(rh)));
  
  if (missingHeaders.length > 0) {
    errors.push(`Colonnes manquantes : ${missingHeaders.join(', ')}`);
  }

  const emailIndex = headers.findIndex(h => h.includes('adresse courriel') || h.includes('courriel') || h.includes('email'));
  
  if (emailIndex === -1) {
    errors.push("Colonne 'Adresse courriel' non trouvée.");
  }

  let validEmails = 0;
  let invalidEmails = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < headers.length) {
      errors.push(`Ligne ${i + 1}: Nombre de colonnes insuffisant (${values.length}/${headers.length}).`);
      continue;
    }

    if (emailIndex >= 0) {
      const email = values[emailIndex];
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        invalidEmails++;
        if (invalidEmails <= 3) {
          errors.push(`Ligne ${i + 1}: Email invalide "${email}"`);
        }
      } else {
        validEmails++;
      }
    }
  }

  if (invalidEmails > 3) {
    errors.push(`... et ${invalidEmails - 3} autres emails invalides`);
  }

  return {
    valid: errors.length === 0 && validEmails > 0,
    errors,
    lineCount: lines.length - 1,
  };
}

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
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{
    count: number;
    participants: Array<{ name: string; email: string; link: string }>;
  } | null>(null);

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

  function validateCsv() {
    const validation = validateCsvFormat(csv);
    setValidationErrors(validation.errors);
    return validation;
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setFeedback(null);
    setValidationErrors([]);
    setSelectedFileName(file.name);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "csv" || extension === "txt") {
        const text = await file.text();
        setCsv(normalizeCsv(text));
        setFeedback(`Fichier chargé : ${file.name}`);
        
        // Auto-validate after file load
        setTimeout(() => validateCsv(), 100);
        return;
      }

      if (!['xlsx', 'xls'].includes(extension || '')) {
        setError("Format non supporté. Utilisez .xlsx, .xls, .csv ou .txt");
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
      
      // Auto-validate after file load
      setTimeout(() => validateCsv(), 100);
    } catch (err) {
      setError(
        "Le fichier n'a pas pu être lu. Vérifiez le format et réessayez.",
      );
    } finally {
      event.target.value = "";
    }
  }

  function handleImport() {
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

    // Validate CSV format before import
    const validation = validateCsv();
    if (!validation.valid) {
      setError(`Format CSV invalide. ${validation.errors.length} erreur(s) détectée(s).`);
      return;
    }

    if (validation.lineCount === 0) {
      setError("Aucune donnée à importer. Ajoutez au moins un employé.");
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
      .then((result: any) => {
        const participantsList = result.participants || [];
        
        // Mapper les participants de manière sécurisée pour éviter les undefined
        const mappedParticipants = participantsList.map((p: any) => {
          // Essayer de trouver le nom sous différentes formes
          const firstName = p.employee?.first_name || p.first_name || '';
          const lastName = p.employee?.last_name || p.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || 'Employé';
          const email = p.employee?.email || p.email || '';
          const token = p.participation_token || p.token || '';
          
          return {
            name: fullName,
            email: email,
            link: `${window.location.origin}/survey-response/${token}`,
          };
        });

        setImportSuccess({
          count: result.imported_employees || 0,
          participants: mappedParticipants,
        });
        setFeedback(`Import réussi ! ${result.imported_employees || 0} employé(s) ajouté(s).`);
      })
      .catch((err) => {
        const errorMessage = err?.message || "L'import a échoué. Vérifiez le format du CSV et réessayez.";
        setError(errorMessage);
      })
      .finally(() => {
        setIsPending(false);
      });
  }

  // Fonction utilitaire pour copier du texte (fonctionne même en HTTP non sécurisé)
  function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback pour HTTP ou anciens navigateurs
      return new Promise((resolve) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          resolve();
        } catch (err) {
          console.error('Fallback copy failed', err);
          resolve();
        }
        document.body.removeChild(textArea);
      });
    }
  }

  function copyAllLinks() {
    if (!importSuccess) return;
    const links = importSuccess.participants.map(p => `${p.name}: ${p.link}`).join('\n');
    copyToClipboard(links).then(() => {
      setFeedback('Tous les liens ont été copiés dans le presse-papiers !');
    });
  }

  function downloadExcelList() {
    if (!importSuccess) return;
    
    // Créer le contenu CSV avec en-têtes
    const headers = ['Nom', 'Prénom', 'Email', 'Fonction', 'Lien Sondage Unique'];
    const rows = importSuccess.participants.map(p => {
      const nameParts = p.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      return [lastName, firstName, p.email, '', p.link];
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    // Ajouter les infos du sondage en haut
    const surveyInfo = [
      `Titre du sondage: ${defaultCampaignName}`,
      `Date d'export: ${new Date().toLocaleDateString('fr-FR')}`,
      `Nombre d'employés: ${importSuccess.count}`,
      '',
    ].join('\n');
    
    const fullContent = surveyInfo + '\n' + csvContent;
    const blob = new Blob(['\ufeff' + fullContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Liens_Sondage_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setFeedback('Fichier Excel/CSV téléchargé avec succès !');
  }

  function continueSurveyCreation() {
    // Rediriger vers "Modifier un sondage" pour continuer la création
    const params = new URLSearchParams();
    params.set("tab", "edit");
    
    const campaignId = propCampaignId ?? managementData.campaignId;
    if (campaignId) {
      params.set("campaignId", String(campaignId));
    }
    
    const scenario = searchParams.get("scenario");
    if (scenario) {
      params.set("scenario", scenario);
    }

    router.push(`/surveys?${params.toString()}`);
  }

  async function handleRemindPending() {
    const campaignId = propCampaignId ?? managementData.campaignId;
    const companyId = propCompanyId ?? managementData.companyId;

    if (!campaignId || !companyId) {
      setError("Aucun sondage actif exploitable n'est disponible.");
      return;
    }

    // Count pending participants
    const pendingCount = managementData.participants.filter(
      p => p.status === "pending" || p.status !== "completed"
    ).length;

    if (pendingCount === 0) {
      setFeedback("Aucun employé en attente de réponse.");
      return;
    }

    if (!confirm(`Relancer ${pendingCount} employé(s) n'ayant pas encore répondu ?`)) {
      return;
    }

    setError(null);
    setFeedback(null);
    setIsPending(true);

    try {
      // Call n8n webhook to send reminders
      const response = await fetch('/api/webhook/n8n/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          companyId,
          remindPending: true,
          message: "Rappel : Votre participation au sondage RPS est attendue.",
        }),
      });

      if (!response.ok) {
        throw new Error("Échec de l'appel à n8n");
      }

      const result = await response.json();
      setFeedback(`Relance envoyée à ${result.reminded || pendingCount} employé(s) !`);
    } catch (err) {
      setError("La relance a échoué. Vérifiez la configuration n8n.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Import Success Confirmation */}
      {importSuccess && (
        <Card className="p-4 sm:p-6 border-emerald-200 bg-emerald-50">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white text-xl font-bold flex-shrink-0">
              ✓
            </div>
            <div className="flex-1 w-full">
              <h3 className="text-lg font-bold text-emerald-900">
                Import terminé avec succès !
              </h3>
              <p className="mt-2 text-sm text-emerald-700">
                {importSuccess.count} employé(s) ont été importé(s) dans le sondage.
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={downloadExcelList}
                    className="rounded-[12px] bg-emerald-700 px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    📥 Télécharger la liste (Excel)
                  </button>
                  <button
                    onClick={continueSurveyCreation}
                    className="rounded-[12px] bg-slate-900 px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    ✏️ Continuer la création du sondage
                  </button>
                  <button
                    onClick={() => setImportSuccess(null)}
                    className="rounded-[12px] border border-slate-300 bg-white px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Retour à la liste
                  </button>
                </div>

                <div className="mt-4 rounded-[12px] bg-white p-3 sm:p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">
                    Liens individuels à partager avec chaque employé :
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importSuccess.participants.map((participant, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-[8px] bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{participant.name}</p>
                          <p className="text-xs text-slate-500">{participant.email}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <code className="text-xs text-slate-600 truncate flex-1 sm:max-w-[200px]">
                            {participant.link}
                          </code>
                          <button
                            onClick={() => {
                              copyToClipboard(participant.link).then(() => {
                                setFeedback(`Lien copié pour ${participant.name} !`);
                              });
                            }}
                            className="text-xs text-white bg-emerald-700 px-2 py-1 rounded hover:bg-emerald-800 font-semibold flex-shrink-0"
                          >
                            Copier
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[3fr_1fr]">
        <Card className="p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Import sondage
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-lg sm:text-xl font-bold">
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
              <label className="inline-flex cursor-pointer items-center justify-center rounded-[12px] border border-slate-200 bg-[#181818] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#242424]">
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

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">
                Données CSV
              </label>
              {csv.trim() && (
                <button
                  onClick={() => validateCsv()}
                  className="text-xs text-amber-700 hover:text-amber-800 font-semibold"
                >
                  Valider le format
                </button>
              )}
            </div>
            <textarea
              value={csv}
              onChange={(event) => {
                setCsv(event.target.value);
                setValidationErrors([]);
              }}
              className="mt-2 min-h-40 w-full rounded-[12px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none font-mono"
              placeholder="Nom,Prénom,Adresse courriel,Fonction&#10;Lefebvre,Anne,anne.lefebvre@test.com,gestionnaire"
            />
            
            {/* Validation errors display */}
            {validationErrors.length > 0 && (
              <div className="mt-3 p-3 rounded-[12px] bg-amber-50 border border-amber-200">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  ⚠️ {validationErrors.length} erreur(s) détectée(s) :
                </p>
                <ul className="space-y-1">
                  {validationErrors.map((err, idx) => (
                    <li key={idx} className="text-xs text-amber-700 flex items-start gap-2">
                      <span className="flex-shrink-0">•</span>
                      <span>{err}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <PrimaryButton
              disabled={isPending || !csv.trim() || validationErrors.length > 0}
              onClick={handleImport}
              className="w-full sm:w-auto"
            >
              {isPending ? "Traitement..." : "Importer dans le sondage"}
            </PrimaryButton>
            <button
              onClick={handleRemindPending}
              disabled={isPending}
              className="rounded-[12px] bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60 w-full sm:w-auto"
              style={{ color: '#ffffff' }}
            >
              {isPending ? "En cours..." : "Relancer les en attente"}
            </button>
          </div>
          
          {feedback && (
            <div className="mt-4 p-3 rounded-[12px] bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-medium text-emerald-700">✓ {feedback}</p>
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 rounded-[12px] bg-rose-50 border border-rose-200">
              <p className="text-sm font-medium text-rose-700">✗ {error}</p>
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Sélection
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-lg sm:text-xl font-bold">
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
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-manrope)] text-lg sm:text-xl font-bold">
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
              className="rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none w-full sm:w-auto"
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

        {filteredParticipants.length === 0 ? (
          <div className="px-4 py-12 sm:px-6 text-center">
            <p className="text-slate-500 text-sm">Aucun participant trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 sm:px-6 py-4">Participant</th>
                  <th className="px-4 sm:px-6 py-4 hidden md:table-cell">Fonction</th>
                  <th className="px-4 sm:px-6 py-4">Statut</th>
                  <th className="px-4 sm:px-6 py-4 hidden lg:table-cell">Invitation</th>
                  <th className="px-4 sm:px-6 py-4">Lien sondage</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="border-t border-slate-100 align-top">
                    <td className="px-4 sm:px-6 py-4">
                      <p className="font-semibold">{participant.name}</p>
                      <p className="mt-1 text-slate-600 text-xs sm:text-sm">{participant.email}</p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-slate-600 hidden md:table-cell">{participant.department}</td>
                    <td className="px-4 sm:px-6 py-4">
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
                    <td className="px-4 sm:px-6 py-4 text-slate-600 hidden lg:table-cell">
                      <p className="text-xs sm:text-sm">{formatShortDate(participant.invitationSentAt)}</p>
                      {participant.reminderSentAt ? (
                        <p className="mt-1 text-xs text-amber-700">
                          Relance : {formatShortDate(participant.reminderSentAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={participant.surveyUrl}
                          className="text-xs sm:text-sm font-semibold text-amber-700 underline-offset-4 hover:underline"
                        >
                          Ouvrir le lien
                        </Link>
                        <code className="max-w-[12rem] sm:max-w-[24rem] truncate text-xs text-slate-500">
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
