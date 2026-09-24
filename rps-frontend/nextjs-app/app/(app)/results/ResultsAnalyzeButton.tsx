"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getTrpcClient, formatTrpcError } from "@/lib/trpc/client";

type AnalyzeState =
  | { type: "idle"; message: null }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export function ResultsAnalyzeButton({
  campaignId,
  canAnalyze,
  hasDeliveredReport = false,
  disabledReason = "Analyse disponible apres la date de fin du sondage.",
}: {
  campaignId: number;
  canAnalyze: boolean;
  hasDeliveredReport?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [state, setState] = useState<AnalyzeState>({ type: "idle", message: null });
  const isDisabled = isAnalyzing || !canAnalyze || hasDeliveredReport;

  async function handleAnalyze() {
    if (!canAnalyze || hasDeliveredReport) {
      return;
    }

    setIsAnalyzing(true);
    setState({ type: "idle", message: null });

    try {
      const result = await getTrpcClient().adminSurveys.analyzeCampaign.mutate({ campaignId });
      setState({
        type: "success",
        message: result.message || "Analyse lancee. Consultez votre Drive dans quelques minutes.",
      });
      router.refresh();
    } catch (error) {
      setState({ type: "error", message: formatTrpcError(error) });
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (hasDeliveredReport) {
    return (
      <div className="max-w-[14rem] rounded-[12px] border border-line bg-accent-soft px-4 py-3 text-xs font-semibold leading-5 text-accent">
        Analyse terminee. Consultez votre Drive.
      </div>
    );
  }

  return (
    <div className="flex max-w-[13rem] flex-col gap-1">
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isDisabled}
        title={!canAnalyze ? disabledReason : undefined}
        className="inline-flex items-center justify-center rounded-[12px] bg-graphite px-4 py-2 text-xs font-semibold shadow-[0_12px_24px_rgba(31,37,40,0.12)] transition hover:-translate-y-0.5 hover:bg-accent disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-track disabled:text-muted"
        style={{ color: "#ffffff" }}
      >
        {isAnalyzing ? "Lancement..." : "Analyser"}
      </button>
      {!canAnalyze ? (
        <p className="text-xs leading-5 text-muted">{disabledReason}</p>
      ) : null}
      {state.message ? (
        <p
          className={`text-xs leading-5 ${
            state.type === "success" ? "text-accent" : "text-graphite"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
