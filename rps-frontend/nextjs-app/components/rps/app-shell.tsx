"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/rps/brand-logo";
import { logout, getUser, type User as AuthUser } from "@/lib/backend/auth";

const pageTitles: Record<string, string> = {
  "/dashboard": "Bonjour, Admin",
  "/surveys": "",
  "/employees": "Gestion des employés",
  "/results": "Résultats",
  "/report": "Synthèse",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const title = pageTitles[pathname] ?? "RPS";
  const [user] = useState<AuthUser | null>(() => getUser());
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

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen text-slate-900">
      <aside className="fixed inset-x-0 top-0 z-30 h-16 border-b border-[rgba(64,54,42,0.08)] bg-[rgba(247,243,235,0.95)] backdrop-blur-xl lg:inset-y-0 lg:left-0 lg:right-auto lg:h-full lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="hidden lg:block border-b border-[rgba(64,54,42,0.08)] px-6 py-6">
            <div className="space-y-3">
              <BrandLogo compact />
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 py-4 lg:flex-col lg:overflow-visible">
            <Link
              href="/dashboard"
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
              aria-expanded={showSurveyMenu ? "true" : "false"}
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
                  { href: "/surveys?tab=create", label: "Créer un sondage", tab: "create" },
                  { href: "/surveys?tab=edit", label: "Modifier un sondage", tab: "edit" },
                ].map((item) => {
                  const active = isSurveyRoute && activeSurveyTab === item.tab;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
              href="/employees"
              className={`flex items-center justify-between rounded-[12px] px-4 py-3 text-sm font-semibold no-underline transition visited:no-underline ${
                pathname === "/employees"
                  ? "bg-slate-900 text-white visited:text-white shadow-lg shadow-slate-300/60 ring-1 ring-slate-800"
                  : "text-slate-600 visited:text-slate-600 hover:bg-[#f2e7d4] hover:text-slate-900"
              }`}
            >
              <span className={pathname === "/employees" ? "text-white" : "text-inherit"}>
                Gestion des employés
              </span>
              {pathname === "/employees" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#f0c36d]" />
              ) : null}
            </Link>

            <Link
              href="/results"
              className={`flex items-center justify-between rounded-[12px] px-4 py-3 text-sm font-semibold no-underline transition visited:no-underline ${
                pathname === "/results"
                  ? "bg-slate-900 text-white visited:text-white shadow-lg shadow-slate-300/60 ring-1 ring-slate-800"
                  : "text-slate-600 visited:text-slate-600 hover:bg-[#f2e7d4] hover:text-slate-900"
              }`}
            >
              <span className={pathname === "/results" ? "text-white" : "text-inherit"}>
                Résultats
              </span>
              {pathname === "/results" ? (
                <span className="h-2.5 w-2.5 rounded-full bg-[#f0c36d]" />
              ) : null}
            </Link>
          </nav>
        </div>
      </aside>

      <main className="pt-16 lg:pt-0 lg:pl-72">
        <header className="sticky top-16 z-20 border-b border-[rgba(64,54,42,0.08)] bg-[rgba(245,240,231,0.90)] backdrop-blur-xl lg:sticky lg:top-0">
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="flex items-center justify-between">
              <div className="lg:hidden mr-4">
                <BrandLogo />
              </div>
              {title ? (
                <h1 className="font-[family-name:var(--font-manrope)] text-xl sm:text-2xl font-extrabold tracking-tight">
                  {title}
                </h1>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="card-surface group relative flex items-center gap-3 rounded-[12px] px-4 py-2.5 transition hover:bg-white hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#d5ba85] bg-gradient-to-br from-[#181818] to-[#2d2d2d] font-bold text-[#f7f1e6] text-sm">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="text-xs text-slate-500">{displayEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                  title="Se déconnecter"
                  aria-label="Se déconnecter"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-6 sm:space-y-8 lg:space-y-10 px-4 py-4 sm:px-6 sm:py-6 lg:px-10">{children}</div>
      </main>
    </div>
  );
}
