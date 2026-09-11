"use client";

import { useState } from "react";
import type { SurveyExportKind } from "@/lib/survey-exports/access";

export function SurveyExportButton({ campaignId, kind, children }: {
  campaignId: number;
  kind: SurveyExportKind;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/admin/campaigns/${campaignId}/exports/${kind}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(typeof body?.error === "string"
          ? body.error
          : "L’export CSV est temporairement indisponible.");
      }
      if (!response.headers.get("content-type")?.includes("text/csv")) {
        throw new Error("Le serveur n’a pas retourné un fichier CSV. Rechargez la page et réessayez.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = response.headers.get("content-disposition")
        ?.match(/filename="([^"]+)"/)?.[1] ?? `survey-${campaignId}-${kind}.csv`;
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
        {pending ? "Préparation du CSV…" : children}
      </button>
      {error ? <p role="alert" className="mt-2 max-w-xs text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
