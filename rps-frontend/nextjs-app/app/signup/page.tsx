"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/rps/brand-logo";
import { Card } from "@/components/rps/ui";
import { createDemoAuthResponse, saveAuth } from "@/lib/backend/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      saveAuth(createDemoAuthResponse(name, email));
      router.push("/dashboard");
    } catch (err) {
      setError("Ouverture de session impossible en mode demo.");
      console.error(err);
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
            Acceder sans authentification
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Renseignez un nom et un email si vous souhaitez personnaliser la session demo.
          </p>
        </div>

        <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8a651f]">
            Session demo
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-manrope)] text-3xl font-extrabold tracking-tight">
            Ouvrir l'application
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Le mot de passe n'est plus requis, mais le formulaire reste disponible pour nommer la session.
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
                placeholder="demo@laroche360.ca"
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
                minLength={1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[12px] border border-[#ddd2c0] bg-[#f7f2ea] px-4 py-3 text-sm outline-none focus:border-[#c9a86c] focus:ring-1 focus:ring-[#c9a86c]"
                placeholder="Non utilise en mode demo"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-[12px] border border-[#d5ba85] bg-[#181818] px-5 py-3 text-sm font-semibold text-[#f7f1e6] shadow-[0_14px_28px_rgba(24,24,24,0.12)] transition hover:-translate-y-0.5 hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Ouverture..." : "Continuer sans authentification"}
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
