"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { login, saveAuth } from "@/lib/backend/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@laroche.fr");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login({ email, password });
      saveAuth(response);
      router.push("/dashboard");
    } catch (err) {
      setError("Identifiants invalides. Veuillez réessayer.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-[rgba(255,252,246,0.92)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a651f] ring-1 ring-[#e6cf9f]">
              Plateforme Laroche
            </p>
            <BrandLogo />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8a651f]">
            Prevention, pilotage et restitution consultant
          </p>
          <h1 className="font-[family-name:var(--font-manrope)] text-5xl font-extrabold tracking-tight text-slate-900">
            Une interface plus sobre, plus nette, centree sur les decisions RH.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Laroche 360 structure la campagne RPS, la collecte terrain et la production d&apos;un rapport Word modifiable par les consultants.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDemoLogin}
              className="rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.12)] transition hover:-translate-y-0.5 hover:bg-[#242424]"
            >
              Acceder a la demo admin
            </button>
            <Link
              href="/survey-response"
              className="rounded-[12px] border border-[#d8ccba] bg-[rgba(255,252,246,0.92)] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#faf4eb]"
            >
              Voir le parcours salarie
            </Link>
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a651f]">
            Bienvenue
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight">
            Acces a l&apos;espace Laroche
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Pilotage des campagnes RPS et revue des rapports consultants
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[12px] border border-[#ddd2c0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none focus:border-[#c9a86c] focus:ring-1 focus:ring-[#c9a86c]"
                placeholder="admin@laroche.fr"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[12px] border border-[#ddd2c0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none focus:border-[#c9a86c] focus:ring-1 focus:ring-[#c9a86c]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.12)] transition hover:-translate-y-0.5 hover:bg-[#242424] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-4 text-xs text-center text-slate-500">
            Demo: admin@laroche.fr / password
          </p>
        </Card>
      </div>
    </div>
  );
}
