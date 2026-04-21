import { NextResponse } from "next/server";
import { postBackend } from "@/lib/backend/client";
import type { AuthResponse, TemporaryAccessCredentials } from "@/lib/backend/auth";
import { allowedAdminEmails } from "@/lib/backend/auth-config";

function resolveTemporaryAccessEmail() {
  const configuredEmail =
    process.env.DEFAULT_TEMPORARY_ACCESS_EMAIL?.trim() ||
    process.env.TEMPORARY_ACCESS_DEFAULT_EMAIL?.trim();

  if (configuredEmail) {
    return configuredEmail.toLowerCase();
  }

  return allowedAdminEmails[0];
}

export async function POST() {
  try {
    const response = await postBackend<AuthResponse, TemporaryAccessCredentials>(
      "/auth/temporary-access",
      {
        email: resolveTemporaryAccessEmail(),
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
