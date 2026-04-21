"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { saveAuth, type AuthResponse } from "@/lib/backend/auth";

function isAuthResponse(payload: AuthResponse | { error?: string } | null): payload is AuthResponse {
  return Boolean(payload && typeof payload === "object" && "user" in payload && "token" in payload);
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function openTemporarySession() {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/temporary-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const payload = (await response.json().catch(() => null)) as
        | AuthResponse
        | { error?: string }
        | null;

      if (!response.ok || !isAuthResponse(payload)) {
        const errorMessage =
          payload && typeof payload === "object" && "error" in payload
            ? payload.error
            : undefined;
        throw new Error(errorMessage || "Ouverture de session temporaire indisponible.");
      }

      saveAuth(payload);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ouverture de session indisponible.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_18%_18%,#f3e4c7_0%,#efe3d1_34%,#ede8df_58%,#e6e3dd_100%)] px-5 py-10 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-[#cfa85f]/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#3f3428]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#8a651f]/15 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-7 rounded-[26px] border border-[#dfd1b9] bg-[rgba(255,252,246,0.88)] p-7 shadow-[0_30px_70px_rgba(40,33,24,0.12)] sm:p-10">
          <div className="flex flex-col items-start gap-2">
            <BrandLogo />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a651f]">
              Mesurez, comprenez, agissez
            </p>
          </div>

          <h1 className="max-w-2xl font-[family-name:var(--font-manrope)] text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Votre espace de pilotage des risques psychosociaux.
          </h1>

          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Pour acceder a l'application, cliquez simplement sur le bouton d'ouverture de session.
            Vous serez redirige vers le tableau de bord.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => void openTemporarySession()}
              disabled={isLoading}
              className="rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.16)] transition hover:-translate-y-0.5 hover:bg-[#242424]"
            >
              {isLoading ? "Connexion..." : "Acceder a l'application"}
            </button>
            <Link
              href="/survey-response"
              className="rounded-[12px] border border-[#d8ccba] bg-[#fffaf1] px-5 py-3 text-sm font-semibold text-slate-700 no-underline transition hover:bg-[#f8eedf]"
            >
              Voir le parcours salarie
            </Link>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md rounded-[22px] border border-[#dfd1b9] bg-[rgba(255,252,246,0.95)] p-6 shadow-[0_24px_60px_rgba(40,33,24,0.16)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a651f]">
            Bienvenue
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-manrope)] text-2xl font-extrabold tracking-tight text-slate-900">
            Acces a votre espace
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            L'acces est temporairement simplifie. Utilisez le bouton ci-dessous pour ouvrir
            l'application sans afficher d'informations sensibles a l'ecran.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-[14px] border border-[#e7dccb] bg-[#f8f3ea] px-4 py-4 text-sm leading-6 text-slate-700">
              Cliquez sur <span className="font-semibold">Ouvrir l'application</span> pour acceder
              directement au tableau de bord.
            </div>

            {error ? (
              <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void openTemporarySession()}
              disabled={isLoading}
              className="w-full rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.14)] transition hover:-translate-y-0.5 hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Connexion..." : "Ouvrir l'application"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
