"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { requestPasswordReset } from "@/lib/backend/auth";

const headingFontClass = "font-heading";
const inputClassName =
  "w-full rounded-[12px] border border-line bg-surface px-4 py-3 text-sm text-graphite outline-none transition focus:border-accent focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:text-muted";
const primaryButtonClassName =
  "w-full rounded-[12px] border border-line bg-graphite px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(31,37,40,0.14)] transition hover:-translate-y-0.5 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-track disabled:text-muted";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await requestPasswordReset({ email });
      setSuccessMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La demande de réinitialisation a echoué.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-page px-5 py-10 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 hidden">
        <div className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-accent-soft blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-accent-soft blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-7 rounded-[26px] border border-line bg-surface p-7 shadow-[0_30px_70px_rgba(31,37,40,0.12)] sm:p-10">
          <div className="flex flex-col items-start gap-3">
            <BrandLogo />
          </div>

          <h1
            className={`max-w-2xl ${headingFontClass} text-4xl font-extrabold leading-tight tracking-tight text-graphite sm:text-5xl`}
          >
            Récupération d'accès.
          </h1>

          <p className="max-w-2xl text-base leading-7 text-muted">
            Entrez votre email administrateur. Si le compte existe, nous enverrons un lien de
            réinitialisation a usage unique.
          </p>
        </section>

        <Card className="mx-auto w-full max-w-md rounded-[22px] border border-line bg-surface p-6 shadow-[0_24px_60px_rgba(31,37,40,0.16)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Assistance de connexion
          </p>
          <h2 className={`mt-2 ${headingFontClass} text-2xl font-extrabold tracking-tight text-graphite`}>
            Réinitialiser mon mot de passe
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Le lien de réinitialisation expire rapidement et ne touche pas votre session actuelle.
          </p>

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="forgot-password-email" className="text-sm font-semibold text-graphite">
                Email
              </label>
              <input
                id="forgot-password-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                className={inputClassName}
                placeholder="admin@entreprise.com"
              />
            </div>

            {successMessage ? (
              <p className="rounded-[10px] border border-line bg-accent-soft px-4 py-3 text-sm text-accent">
                {successMessage}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-[10px] border border-muted bg-page px-4 py-3 text-sm text-graphite">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={isLoading} className={primaryButtonClassName}>
              {isLoading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
            <Link href="/login" className="text-accent underline-offset-4 hover:underline">
              Retour a la connexion
            </Link>
            <Link href="/signup" className="text-muted underline-offset-4 hover:underline">
              Créer un compte
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
