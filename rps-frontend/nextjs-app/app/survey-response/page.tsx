import Link from "next/link";
import { SurveyAccessForm } from "@/components/rps/survey-access-form";

export default function SurveyResponsePage() {
  return (
    <div className="min-h-screen px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto mb-6 flex max-w-3xl justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            Employee side
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-manrope)] text-3xl font-extrabold">
            Parcours de reponse
          </h1>
        </div>
        <Link
          href="/login"
          className="rounded-[12px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Retour login
        </Link>
      </div>
      <SurveyAccessForm />
    </div>
  );
}
