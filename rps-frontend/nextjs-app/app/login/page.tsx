"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { formatTrpcError } from "@/lib/trpc/client";
import { saveAuth, temporaryAccess } from "@/lib/backend/auth";
import {
  allowedAdminEmails,
  isAllowedAdminEmail,
  normalizeAdminEmail,
} from "@/lib/backend/auth-config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(allowedAdminEmails[0]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function openTemporarySession(nextEmail: string) {
    const normalizedEmail = normalizeAdminEmail(nextEmail);

    if (!isAllowedAdminEmail(normalizedEmail)) {
      setError("Seuls les comptes Isabelle et Roxanne sont autorises pour le moment.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await temporaryAccess({ email: normalizedEmail });
      saveAuth(response);
      router.push("/dashboard");
    } catch (err) {
      setError(formatTrpcError(err));
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await openTemporarySession(email);
  };

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
            Votre solution complete pour evaluer les risques psychosociaux.
          </h1>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => openTemporarySession("isabelle@laroche360.ca")}
              disabled={isLoading}
              className="rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.16)] transition hover:-translate-y-0.5 hover:bg-[#242424]"
            >
              Acceder avec Isabelle
            </button>
            <button
              onClick={() => openTemporarySession("roxanne@laroche360.ca")}
              disabled={isLoading}
              className="rounded-[12px] border border-[#d8ccba] bg-[#fffaf1] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-[#f8eedf] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Acceder avec Roxanne
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
            Acces temporaire en attendant l'authentification finale. Seules les adresses
            `isabelle@laroche360.ca` et `roxanne@laroche360.ca` sont actives.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[12px] border border-[#ddd2c0] bg-[#f8f3ea] px-4 py-3 text-sm outline-none transition focus:border-[#c9a86c] focus:ring-2 focus:ring-[#c9a86c]/30"
                placeholder="isabelle@laroche360.ca"
              />
            </div>

            {error ? (
              <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.14)] transition hover:-translate-y-0.5 hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Connexion..." : "Ouvrir la session"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
