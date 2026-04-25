"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { createDemoAuthResponse, saveAuth } from "@/lib/backend/auth";

const DEMO_EMAIL = "demo@laroche360.ca";
const DEMO_PASSWORD_MASK = "********";
const DEMO_BUTTON_LABEL = "Acceder au mode démo";
const headingFontClass = "font-[family-name:var(--font-manrope)]";
const disabledInputClassName =
  "w-full rounded-[12px] border border-[#ddd2c0] bg-[#efe8db] px-4 py-3 text-sm text-slate-500 outline-none disabled:cursor-not-allowed";
const primaryButtonClassName =
  "w-full rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.14)] transition hover:-translate-y-0.5 hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClassName =
  "rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.16)] transition hover:-translate-y-0.5 hover:bg-[#242424]";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function openDemoSession() {
    setError(null);
    setIsLoading(true);

    try {
      saveAuth(createDemoAuthResponse("Mode demo", DEMO_EMAIL));
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

          <h1 className={`max-w-2xl ${headingFontClass} text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl`}>
            Votre espace de pilotage des risques psychosociaux.
          </h1>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={openDemoSession}
              disabled={isLoading}
              className={secondaryButtonClassName}
            >
              {isLoading ? "Ouverture..." : DEMO_BUTTON_LABEL}
            </button>
            <Link
              href="/survey-response"
              className="rounded-[12px] border border-[#d8ccba] bg-[#fffaf1] px-5 py-3 text-sm font-semibold text-slate-700 no-underline transition hover:bg-[#f8eedf]"
            >
              Voir le parcours salarié
            </Link>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md rounded-[22px] border border-[#dfd1b9] bg-[rgba(255,252,246,0.95)] p-6 shadow-[0_24px_60px_rgba(40,33,24,0.16)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a651f]">
            Bienvenue
          </p>
          <h2 className={`mt-2 ${headingFontClass} text-2xl font-extrabold tracking-tight text-slate-900`}>
            Accès à votre espace
          </h2>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={DEMO_EMAIL}
                disabled
                readOnly
                className={disabledInputClassName}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                Mot de passe
              </label>
              <input
                id="login-password"
                type="password"
                value={DEMO_PASSWORD_MASK}
                disabled
                readOnly
                className={disabledInputClassName}
              />
            </div>

            <div className="rounded-[14px] border border-[#e7dccb] bg-[#f8f3ea] px-4 py-4 text-sm leading-6 text-slate-700">
              Cliquez sur <span className="font-semibold">Accéder au mode démo</span> pour ouvrir
              directement le tableau de bord.
            </div>

            {error ? (
              <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={openDemoSession}
              disabled={isLoading}
              className={primaryButtonClassName}
            >
              {isLoading ? "Ouverture..." : DEMO_BUTTON_LABEL}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
