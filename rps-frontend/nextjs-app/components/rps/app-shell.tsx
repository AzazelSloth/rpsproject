"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/rps/brand-logo";
import { getDemoDataset, navItems, resolveDemoScenario } from "@/lib/demo-data";
import { Card, Pill } from "@/components/rps/ui";
import { logout, getUser } from "@/lib/backend/auth";

const pageTitles: Record<string, string> = {
  "/dashboard": "Bonjour, Admin",
  "/surveys": "Creation et pilotage des sondages",
  "/employees": "Gestion des employes",
  "/results": "Resultats et analyses",
  "/report": "Rapports et recommandations",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenario = resolveDemoScenario(searchParams.get("scenario"));
  const demoDataset = getDemoDataset(scenario);
  const title = pageTitles[pathname] ?? "RPS Platform";
  const user = getUser();

  function buildHref(path: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("scenario", scenario);
    return `${path}?${params.toString()}`;
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
              <div>
                <p className="text-sm font-semibold text-slate-800">RPS Platform</p>
                <p className="text-sm text-slate-500">Psychosocial Risk Management</p>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 py-4 lg:flex-col lg:overflow-visible">
            {navItems.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={buildHref(item.href)}
                  className={`flex items-center justify-between rounded-[12px] px-4 py-3 text-sm font-semibold no-underline transition visited:no-underline ${
                    active
                      ? "bg-slate-900 text-white visited:text-white shadow-lg shadow-slate-300/60 ring-1 ring-slate-800"
                      : "text-slate-600 visited:text-slate-600 hover:bg-[#f2e7d4] hover:text-slate-900"
                  }`}
                >
                  <span className={active ? "text-white" : "text-inherit"}>{item.label}</span>
                  {active ? <span className="h-2.5 w-2.5 rounded-full bg-[#f0c36d]" /> : null}
                </Link>
              );
            })}
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
              <p className="text-sm font-medium text-slate-500">Plateforme RPS</p>
              <h1 className="font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight">
                {title}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Card className="flex items-center gap-3 rounded-[12px] px-4 py-3">
                <Pill>{demoDataset.notifications.length} notifications</Pill>
                <span className="text-sm text-slate-600">{demoDataset.notifications[0]}</span>
              </Card>
              <div className="card-surface flex items-center gap-3 rounded-[12px] px-4 py-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d5ba85] bg-[#181818] font-bold text-[#f7f1e6]">
                  {(user?.name || "Admin")
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold">{user?.name || "Admin"}</p>
                  <p className="text-xs text-slate-500">{user?.email || "admin@laroche.fr"}</p>
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
