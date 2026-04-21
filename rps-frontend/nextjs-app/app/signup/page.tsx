"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { formatTrpcError } from "@/lib/trpc/client";
import { saveAuth, temporaryAccess } from "@/lib/backend/auth";
import {
  allowedAdminEmails,
  isAllowedAdminEmail,
  normalizeAdminEmail,
} from "@/lib/backend/auth-config";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("Admin Laroche");
  const [email, setEmail] = useState(allowedAdminEmails[0]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const normalizedEmail = normalizeAdminEmail(email);

      if (!isAllowedAdminEmail(normalizedEmail)) {
        throw new Error(
          "Seuls les comptes Isabelle et Roxanne peuvent ouvrir une session pour le moment.",
        );
      }

      const response = await temporaryAccess({
        name: name.trim() || undefined,
        email: normalizedEmail,
      });
      saveAuth(response);
      router.push("/dashboard");
    } catch (err) {
      setError(formatTrpcError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-[rgba(255,252,246,0.92)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8a651f] ring-1 ring-[#e6cf9f]">
              Plateforme Laroche
            </p>
            <BrandLogo />
          </div>
          <h1 className="font-[family-name:var(--font-manrope)] text-4xl font-extrabold tracking-tight text-slate-900">
            Creer un acces temporaire
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Cette ouverture de session provisoire est reservee a Isabelle et Roxanne en attendant
            la mise en place de l'authentification definitive.
          </p>
        </div>

        <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a651f]">
            Acces provisoire
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight">
            Ouvrir l'application
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Le nom sert seulement a personnaliser le profil local. L'email doit etre celui d'un
            compte autorise.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">
                Nom
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[12px] border border-[#ddd2c0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none focus:border-[#c9a86c] focus:ring-1 focus:ring-[#c9a86c]"
                placeholder="Admin demo"
              />
            </div>
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
                placeholder="isabelle@laroche360.ca"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.12)] transition hover:-translate-y-0.5 hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Ouverture..." : "Ouvrir la session"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-500">
            Retour a{" "}
            <Link href="/login" className="text-[#8a651f] underline-offset-4 hover:underline">
              la connexion
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
