"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { register, saveAuth } from "@/lib/backend/auth";
const headingFontClass = "font-heading";
const inputClassName =
  "w-full rounded-[12px] border border-line bg-surface px-4 py-3 text-sm text-graphite outline-none transition focus:border-accent focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:text-muted";
const primaryButtonClassName =
  "w-full rounded-[12px] border border-line bg-graphite px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(31,37,40,0.14)] transition hover:-translate-y-0.5 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-track disabled:text-muted";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await register({ name, email, password });
      saveAuth(response);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'inscription a échoué.");
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
          <div className="flex flex-col items-start gap-2">
            <BrandLogo />
          </div>

          <h1 className={`max-w-2xl ${headingFontClass} text-4xl font-extrabold leading-tight tracking-tight text-graphite sm:text-5xl`}>
            Créez votre espace administrateur.
          </h1>

         

          <div className="flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-[12px] border border-line bg-surface px-5 py-3 text-sm font-semibold text-graphite no-underline transition hover:bg-accent-soft"
            >
              J'ai déjà un compte
            </Link>
          </div>
        </section>

        <Card className="mx-auto w-full max-w-md rounded-[22px] border border-line bg-surface p-6 shadow-[0_24px_60px_rgba(31,37,40,0.16)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Inscription
          </p>
          <h2 className={`mt-2 ${headingFontClass} text-2xl font-extrabold tracking-tight text-graphite`}>
            Créer un compte
          </h2>

          <form onSubmit={handleSignup} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="signup-name" className="text-sm font-semibold text-graphite">
                Nom complet
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isLoading}
                className={inputClassName}
                placeholder="Jean Dupont"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-email" className="text-sm font-semibold text-graphite">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                className={inputClassName}
                placeholder="votre@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="signup-password" className="text-sm font-semibold text-graphite">
                Mot de passe
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading}
                className={inputClassName}
                placeholder="Min. 6 caractères"
                minLength={6}
                required
              />
            </div>

            {error ? (
              <p className="rounded-[10px] border border-muted bg-page px-3 py-2 text-sm text-graphite">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={isLoading} className={primaryButtonClassName}>
              {isLoading ? "Création..." : "Créer mon compte"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
