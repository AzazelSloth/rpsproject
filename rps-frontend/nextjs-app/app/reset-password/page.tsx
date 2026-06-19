"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { resetPassword } from "@/lib/backend/auth";

const headingFontClass = "font-[family-name:var(--font-manrope)]";
const inputClassName =
  "w-full rounded-[12px] border border-[#ddd2c0] bg-[#f8f3ea] px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#c9a86c] focus:ring-2 focus:ring-[#c9a86c]/30 disabled:cursor-not-allowed disabled:text-slate-500";
const primaryButtonClassName =
  "w-full rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.14)] transition hover:-translate-y-0.5 hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-60";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [hasLoadedToken, setHasLoadedToken] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const nextToken = new URLSearchParams(window.location.search).get("token")?.trim() ?? "";
    setToken(nextToken);
    setHasLoadedToken(true);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token) {
      setError("Le lien de reinitialisation est invalide ou incomplet.");
      return;
    }

    if (password.length < 6) {
      setError("Le nouveau mot de passe doit contenir au moins 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await resetPassword({ token, password });
      setSuccessMessage(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "La mise a jour du mot de passe a echoue.");
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
          <div className="flex flex-col items-start gap-3">
            <BrandLogo />
          </div>

          <h1
            className={`max-w-2xl ${headingFontClass} text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl`}
          >
            Nouveau mot de passe.
          </h1>

          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Choisissez un nouveau mot de passe pour retrouver l acces a votre espace
            administrateur.
          </p>
        </section>

        <Card className="mx-auto w-full max-w-md rounded-[22px] border border-[#dfd1b9] bg-[rgba(255,252,246,0.95)] p-6 shadow-[0_24px_60px_rgba(40,33,24,0.16)] sm:p-8">
          <h2 className={`${headingFontClass} text-2xl font-extrabold tracking-tight text-slate-900`}>
            Reinitialiser le mot de passe
          </h2>

          {hasLoadedToken && !token ? (
            <p className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Le lien de reinitialisation est invalide ou incomplet.
            </p>
          ) : null}

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="reset-password" className="text-sm font-semibold text-slate-700">
                Nouveau mot de passe
              </label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading || !hasLoadedToken || !token}
                className={inputClassName}
                placeholder="Au moins 6 caracteres"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reset-password-confirmation"
                className="text-sm font-semibold text-slate-700"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="reset-password-confirmation"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isLoading || !hasLoadedToken || !token}
                className={inputClassName}
                placeholder="Retapez le mot de passe"
              />
            </div>

            {successMessage ? (
              <p className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {successMessage}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading || !hasLoadedToken || !token}
              className={primaryButtonClassName}
            >
              {isLoading ? "Mise a jour..." : "Mettre a jour le mot de passe"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
            <Link href="/login" className="text-[#8a651f] underline-offset-4 hover:underline">
              Retour a la connexion
            </Link>
            <Link href="/forgot-password" className="text-slate-600 underline-offset-4 hover:underline">
              Demander un nouveau lien
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
