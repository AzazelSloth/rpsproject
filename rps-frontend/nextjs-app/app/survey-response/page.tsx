import Link from "next/link";
import { SurveyAccessForm } from "@/components/rps/survey-access-form";

export default function SurveyResponsePage() {
  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      {/* En-tête d'accès masqué à la demande du client.
      <div className="mx-auto mb-6 flex max-w-3xl justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            Accès employé
          </p>
          <h1 className="mt-2 font-heading text-3xl font-extrabold">
            Accès au sondage
          </h1>
        </div>
        <Link
          href="/login"
          className="rounded-[12px] border border-line bg-white px-5 py-3 text-sm font-semibold text-graphite transition hover:bg-page"
        >
          Retour à la page de connexion
        </Link>
      </div> */}
      <SurveyAccessForm />
    </div>
  );
}
