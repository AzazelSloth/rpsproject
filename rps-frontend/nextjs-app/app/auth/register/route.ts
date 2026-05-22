import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type AuthResponse, type RegisterCredentials } from "@/lib/backend/auth";
import { postBackend } from "@/lib/backend/client";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();

  if (forwardedProtocol) {
    return forwardedProtocol === "https";
  }

  return new URL(request.url).protocol === "https:";
}

export async function POST(request: Request) {
  try {
    const credentials = (await request.json()) as RegisterCredentials;
    const response = await postBackend<AuthResponse, RegisterCredentials>("/auth/register", credentials);
    const cookieStore = await cookies();

    cookieStore.set("auth_token", response.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Inscription indisponible pour ce compte.",
      },
      { status: 400 },
    );
  }
}
