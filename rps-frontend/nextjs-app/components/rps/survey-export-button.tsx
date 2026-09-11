"use client";

import { useState } from "react";
import { SURVEY_EXPORT_CONTENT_TYPES, type SurveyExportKind, type SurveyExportFormat } from "@/lib/survey-exports/access";

export function SurveyExportButton({ campaignId, kind, children }: {
  campaignId: number;
  kind: SurveyExportKind;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [format, setFormat] = useState<SurveyExportFormat>("xlsx");
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/admin/campaigns/${campaignId}/exports/${kind}?format=${format}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === "string"
          ? body.error
          : "L’export est temporairement indisponible.");
      }
      if (response.headers.get("content-type")?.split(";")[0].trim() !== SURVEY_EXPORT_CONTENT_TYPES[format]) {
        throw new Error("Le serveur n’a pas retourné le fichier demandé. Rechargez la page et réessayez.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? `survey-${campaignId}-${kind}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le téléchargement a échoué.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={download} disabled={pending}
        className="inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-[0_12px_24px_rgba(24,24,24,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:opacity-50">
        {pending ? (format === "xlsx" ? "Préparation du fichier Excel…" : "Préparation du CSV…") : children}
      </button>
      <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
        Format
        <select
          aria-label={`Format de l’export des questions ${kind === "closed" ? "fermées" : "texte"}`}
          value={format}
          disabled={pending}
          onChange={(event) => setFormat(event.target.value === "csv" ? "csv" : "xlsx")}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 disabled:opacity-50"
        >
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV (.csv)</option>
        </select>
      </label>
      {error ? <p role="alert" className="mt-2 max-w-xs text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
