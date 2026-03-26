"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Card, Pill, PrimaryButton, SecondaryButton } from "@/components/rps/ui";
import type { EmployeeManagementData } from "@/lib/repositories/rps-repository";

export function EmployeesTableDemo({
  managementData,
}: {
  managementData: EmployeeManagementData;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "reminded">("all");
  const [csv, setCsv] = useState(
    "email,first_name,last_name,department\nj.dupond@laroche.fr,Julie,Dupond,Finance\nm.bernard@laroche.fr,Marc,Bernard,IT",
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredParticipants = useMemo(() => {
    return managementData.participants.filter((participant) => {
      const haystack = `${participant.name} ${participant.email} ${participant.department}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesFilter = filter === "all" || participant.status === filter;

      return matchesQuery && matchesFilter;
    });
  }, [filter, managementData.participants, query]);

  function runAdminAction(payload: object, successMessage: string) {
    setFeedback(null);
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/campaign-participants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error("request_failed");
        }

        setFeedback(successMessage);
        router.refresh();
      } catch {
        setError("L'action admin a echoue. Verifie la configuration de l'API.");
      }
    });
  }

  function handleImport() {
    if (!managementData.campaignId || !managementData.companyId) {
      setError("Aucune campagne active exploitable n'est disponible.");
      return;
    }

    runAdminAction(
      {
        action: "import",
        campaignId: managementData.campaignId,
        companyId: managementData.companyId,
        csv,
      },
      "Import des salaries termine.",
    );
  }

  function handleRemind(force = false) {
    if (!managementData.campaignId) {
      setError("Aucune campagne active exploitable n'est disponible.");
      return;
    }

    runAdminAction(
      {
        action: "remind",
        campaignId: managementData.campaignId,
        minimumDaysSinceInvitation: 3,
        force,
      },
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

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Import campagne
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Ajouter des salaries a la campagne
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Colle un CSV simple pour creer les participants et generer leurs liens uniques.
          </p>
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
            <SecondaryButton disabled={isPending} onClick={() => handleRemind(true)}>
              Forcer une relance
            </SecondaryButton>
          </div>
          {feedback ? <p className="mt-4 text-sm font-medium text-emerald-700">{feedback}</p> : null}
          {error ? <p className="mt-4 text-sm font-medium text-rose-700">{error}</p> : null}
        </Card>

        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Pilotage campagne
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-manrope)] text-xl font-bold">
            Etat des invitations
          </h3>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[12px] bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Statut</p>
              <p className="mt-2 text-lg font-bold capitalize">{managementData.campaignStatus}</p>
            </div>
            <div className="rounded-[12px] bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Relances</p>
              <p className="mt-2 text-lg font-bold">{managementData.remindedParticipants}</p>
            </div>
            <div className="rounded-[12px] bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Campagne ID</p>
              <p className="mt-2 text-lg font-bold">{managementData.campaignId ?? "-"}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-600">
            Chaque participant dispose d&apos;un lien personnel vers son questionnaire, visible dans le tableau ci-dessous.
          </p>
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
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Invitation</th>
                <th className="px-6 py-4">Survey link</th>
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
