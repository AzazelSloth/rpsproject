import { NextResponse } from "next/server";
import { postBackend } from "@/lib/backend/client";
import type { AuthResponse, TemporaryAccessCredentials } from "@/lib/backend/auth";
import { getConfiguredAdminEmails } from "@/lib/backend/auth-config";

function isTemporaryAccessEnabled() {
  return process.env.TEMPORARY_ACCESS_ENABLED === "true";
}

function createDisabledResponse() {
  return NextResponse.json(
    {
      error: "L'acces temporaire est desactive. Utilise le formulaire de connexion administrateur.",
    },
    { status: 403 },
  );
}

function resolveTemporaryAccessEmail() {
  const configuredEmail =
    process.env.DEFAULT_TEMPORARY_ACCESS_EMAIL?.trim() ||
    process.env.TEMPORARY_ACCESS_DEFAULT_EMAIL?.trim();

  if (configuredEmail) {
    return configuredEmail.toLowerCase();
  }

  const allowedEmails = getConfiguredAdminEmails();
  return allowedEmails[0] ?? null;
}

const TEMPORARY_ACCESS_DELAY_MS = Number(process.env.TEMPORARY_ACCESS_DELAY_MS) || 2000;

export async function POST() {
  if (!isTemporaryAccessEnabled()) {
    return createDisabledResponse();
  }

  const email = resolveTemporaryAccessEmail();
  if (!email) {
    return NextResponse.json(
      {
        error:
          "DEFAULT_TEMPORARY_ACCESS_EMAIL doit etre configure pour utiliser l'acces temporaire.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await postBackend<AuthResponse, TemporaryAccessCredentials>(
      "/auth/temporary-access",
      {
        email,
      },
    );

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ouverture de session temporaire indisponible.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!isTemporaryAccessEnabled()) {
    return createDisabledResponse();
  }

  const email = resolveTemporaryAccessEmail();
  if (!email) {
    return NextResponse.json(
      {
        error:
          "DEFAULT_TEMPORARY_ACCESS_EMAIL doit etre configure pour utiliser l'acces temporaire.",
      },
      { status: 500 },
    );
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, TEMPORARY_ACCESS_DELAY_MS));

    const response = await postBackend<AuthResponse, TemporaryAccessCredentials>(
      "/auth/temporary-access",
      {
        email,
      },
    );

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ouverture de session temporaire indisponible.",
      },
      { status: 500 },
    );
  }
}
