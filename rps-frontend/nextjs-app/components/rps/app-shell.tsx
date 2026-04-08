"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/rps/brand-logo";
import { getDemoDataset, resolveDemoScenario } from "@/lib/demo-data";
import { Card } from "@/components/rps/ui";
import { logout, getUser, type User as AuthUser } from "@/lib/backend/auth";

const pageTitles: Record<string, string> = {
  "/dashboard": "Bonjour, Admin",
  "/surveys": "Gestion des sondages",
  "/employees": "Gestion des employes",
  "/results": "Resultats",
  "/report": "Rapport",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenario = resolveDemoScenario(searchParams.get("scenario"));
  const demoDataset = getDemoDataset(scenario);
  const title = pageTitles[pathname] ?? "RPS";
  const [user, setUser] = useState<AuthUser | null>(null);
  const activeSurveyTab = searchParams.get("tab") ?? "create";
  const isSurveyRoute = pathname === "/surveys";
  const [surveysOpen, setSurveysOpen] = useState(isSurveyRoute);
  const showSurveyMenu = surveysOpen || isSurveyRoute;
  const displayName = user?.name?.trim() || "Admin";
  const displayEmail = user?.email?.trim() || "isabelle@laroche360.ca";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "A";

  useEffect(() => {
    setUser(getUser());
  }, []);

  function buildHref(path: string) {
    const [pathPart, queryString] = path.split("?");
    const params = new URLSearchParams(queryString ?? "");
    const currentParams = new URLSearchParams(searchParams.toString());

    currentParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });

    params.set("scenario", scenario);

    const serialized = params.toString();
    return serialized ? `${pathPart}?${serialized}` : pathPart;
  }

  function handleScenarioChange(nextScenario: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scenario", nextScenario);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen text-slate-900">
      <aside className="fixed inset-x-0 top-0 z-30 border-b border-[rgba(64,54,42,0.08)] bg-[rgba(247,243,235,0.88)] backdrop-blur-xl lg:inset-y-0 lg:left-0 lg:right-auto lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="border-b border-[rgba(64,54,42,0.08)] px-6 py-6">
            <div className="space-y-3">
              <BrandLogo compact />
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 py-4 lg:flex-col lg:overflow-visible">
            <Link
              href={buildHref("/dashboard")}
              className={`flex items-center justify-between rounded-[12px] px-4 py-3 text-sm font-semibold no-underline transition visited:no-underline ${
                pathname === "/dashboard"
                  ? "bg-slate-900 text-white visited:text-white shadow-lg shadow-slate-300/60 ring-1 ring-slate-800"
                  : "text-slate-600 visited:text-slate-600 hover:bg-[#f2e7d4] hover:text-slate-900"
              }`}
            >
              <span className={pathname === "/dashboard" ? "text-white" : "text-inherit"}>
                Tableau de bord
              </span>
              {pathname === "/dashboard" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#f0c36d]" />
              ) : null}
            </Link>

            <button
              type="button"
              onClick={() => setSurveysOpen((value) => !value)}
              className={`flex items-center justify-between rounded-[12px] px-4 py-3 text-left text-sm font-semibold transition ${
                isSurveyRoute
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-300/60 ring-1 ring-slate-800"
                  : "text-slate-600 hover:bg-[#f2e7d4] hover:text-slate-900"
              }`}
              aria-expanded={showSurveyMenu}
            >
              <span className={isSurveyRoute ? "text-white" : "text-inherit"}>
                Gestion des sondages
              </span>
              <span className="text-xs">{showSurveyMenu ? "v" : ">"}</span>
            </button>

            {showSurveyMenu ? (
              <div className="flex flex-col gap-2 pl-4">
                {[
                  { href: "/surveys?tab=list", label: "Liste des sondages", tab: "list" },
                  { href: "/surveys?tab=create", label: "Creer un sondage", tab: "create" },
                  { href: "/surveys?tab=edit", label: "Modifier un sondage", tab: "edit" },
                ].map((item) => {
                  const active = isSurveyRoute && activeSurveyTab === item.tab;

                  return (
                    <Link
                      key={item.href}
                      href={buildHref(item.href)}
                      className={`flex items-center justify-between rounded-[10px] px-3 py-2 text-xs font-semibold no-underline transition visited:no-underline ${
                        active
                          ? "bg-[#f1e4cb] text-slate-900 ring-1 ring-[#e6cf9f]"
                          : "text-slate-500 visited:text-slate-500 hover:bg-[#f6eddc] hover:text-slate-900"
                      }`}
                    >
                      <span>{item.label}</span>
                      {active ? <span className="h-2 w-2 rounded-full bg-[#8a651f]" /> : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}

            <Link
              href={buildHref("/employees")}
              className={`flex items-center justify-between rounded-[12px] px-4 py-3 text-sm font-semibold no-underline transition visited:no-underline ${
                pathname === "/employees"
                  ? "bg-slate-900 text-white visited:text-white shadow-lg shadow-slate-300/60 ring-1 ring-slate-800"
                  : "text-slate-600 visited:text-slate-600 hover:bg-[#f2e7d4] hover:text-slate-900"
              }`}
            >
              <span className={pathname === "/employees" ? "text-white" : "text-inherit"}>
                Gestion des employes
              </span>
              {pathname === "/employees" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#f0c36d]" />
              ) : null}
            </Link>

            <Link
              href={buildHref("/results")}
              className={`flex items-center justify-between rounded-[12px] px-4 py-3 text-sm font-semibold no-underline transition visited:no-underline ${
                pathname === "/results"
                  ? "bg-slate-900 text-white visited:text-white shadow-lg shadow-slate-300/60 ring-1 ring-slate-800"
                  : "text-slate-600 visited:text-slate-600 hover:bg-[#f2e7d4] hover:text-slate-900"
              }`}
            >
              <span className={pathname === "/results" ? "text-white" : "text-inherit"}>
                Resultats
              </span>
              {pathname === "/results" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#f0c36d]" />
              ) : null}
            </Link>
          </nav>

          <div className="hidden px-6 pb-6 pt-4 lg:block">
            <Card className="grid-pattern p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a651f]">
                Demo mode
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-manrope)] text-lg font-bold">
                {demoDataset.scenarioLabel}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Donnees de test dynamiques, coherentes entre les pages, pour simuler plusieurs contextes RPS.
              </p>
              <select
                value={scenario}
                onChange={(event) => handleScenarioChange(event.target.value)}
                className="mt-4 w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              >
                <option value="baseline">Equilibre fragile</option>
                <option value="tension">Tension operationnelle</option>
                <option value="critical">Alerte critique</option>
              </select>
            </Card>
          </div>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-[72px] z-20 border-b border-[rgba(64,54,42,0.08)] bg-[rgba(245,240,231,0.82)] backdrop-blur-xl lg:top-0">
          <div className="flex flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div>
              <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight">
                {title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="card-surface flex items-center gap-3 rounded-[12px] px-4 py-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d5ba85] bg-[#181818] font-bold text-[#f7f1e6]">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="text-xs text-slate-500">{displayEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 text-xs text-slate-500 hover:text-red-600"
                  title="Se deconnecter"
                >
                  X
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-10 px-5 py-6 sm:px-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
