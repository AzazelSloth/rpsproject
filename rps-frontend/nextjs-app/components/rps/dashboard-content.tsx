"use client";

import Link from "next/link";
import { SurveyListTable } from "@/components/rps/survey-list-table";
import { PrimaryButton, SectionHeader } from "@/components/rps/ui";
import type { SurveyOption } from "@/lib/repositories/rps-repository";

export function DashboardContent({
  surveys,
  scenario,
}: {
  surveys: SurveyOption[];
  scenario?: string | null;
}) {
  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Tableau de bord"
        title="Liste des sondages"
        description="Accède aux sondages par entreprise, avec statut, taux de complétion et accès direct aux résultats."
        action={
          <Link href="/surveys?tab=create" className="inline-flex">
            <PrimaryButton>Créer un sondage</PrimaryButton>
          </Link>
        }
      />

      <SurveyListTable surveys={surveys} scenario={scenario} />
    </section>
  );
}
