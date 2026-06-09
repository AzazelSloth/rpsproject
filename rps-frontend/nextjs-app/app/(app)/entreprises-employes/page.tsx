import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entreprises et employes | Laroche 360",
};

const AWESOME_TABLE_HOSTS = new Set([
  "awesome-table.com",
  "app.awesome-table.com",
  "view-awesome-table.com",
]);

function getAwesomeTableUrl() {
  const rawUrl = process.env.AWESOME_TABLE_EMPLOYEES_URL?.trim();

  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);

    if (url.protocol !== "https:" || !AWESOME_TABLE_HOSTS.has(url.hostname.toLowerCase())) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export default function EntreprisesEmployesPage() {
  const awesomeTableUrl = getAwesomeTableUrl();

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8a651f]">
            Vue interne
          </p>
          <h2 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
            Entreprises et employes
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Vue Awesome Table dediee aux listes anonymisees par entreprise.
          </p>
        </div>

        {awesomeTableUrl ? (
          <a
            href={awesomeTableUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Ouvrir
          </a>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[rgba(64,54,42,0.1)] bg-white shadow-[0_18px_45px_rgba(42,32,18,0.08)]">
        {awesomeTableUrl ? (
          <iframe
            src={awesomeTableUrl}
            title="Vue Awesome Table entreprises et employes"
            className="block min-h-[720px] w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          />
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-bold text-slate-900">Vue Awesome Table non configuree.</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Definir AWESOME_TABLE_EMPLOYEES_URL avec le lien iframe/direct link de la vue
              Awesome Table anonymisee.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
