"use client";

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { getTrpcClient, formatTrpcError } from '@/lib/trpc/client';

type TimingRow = {
  participant_id: number;
  employee_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  active_seconds: number | null;
};

export function SurveyTimingDialog({ campaignId, onClose }: { campaignId: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [rows, setRows] = useState<TimingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialog.current?.showModal();
    const element = dialog.current;
    return () => element?.close();
  }, []);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    async function refresh() {
      if (inFlight) return;
      inFlight = true;
      try {
        const result = await getTrpcClient().surveyResponses.timing.query({ campaignId });
        if (active) { setRows(result); setError(null); }
      } catch (cause) {
        if (active) { setRows([]); setError(formatTrpcError(cause)); }
      } finally {
        inFlight = false;
        if (active) setLoading(false);
      }
    }
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [campaignId]);

  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-labelledby="survey-timing-title"
    className="m-auto w-[min(95vw,900px)] rounded-xl border border-slate-200 bg-white p-6 backdrop:bg-slate-950/50">
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 id="survey-timing-title" className="text-xl font-bold">Horotateur</h2>
      <button type="button" aria-label="Fermer" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X aria-hidden className="h-5 w-5" /></button>
    </div>
    {loading ? <LoaderCircle aria-label="Chargement" className="h-5 w-5 animate-spin" /> : null}
    {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr>{['Employé', 'Début', 'Fin', 'Durée active'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.participant_id} className="border-t border-slate-100">
          <td className="px-3 py-3">{row.employee_name ?? '—'}</td>
          <td className="whitespace-nowrap px-3 py-3">{formatDate(row.started_at)}</td>
          <td className="whitespace-nowrap px-3 py-3">{formatDate(row.completed_at)}</td>
          <td className="px-3 py-3 tabular-nums">{formatDuration(row.active_seconds)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </dialog>;
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('fr-CA', {
    dateStyle: 'short', timeStyle: 'long',
  }).format(new Date(value)) : '—';
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—';
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
}
