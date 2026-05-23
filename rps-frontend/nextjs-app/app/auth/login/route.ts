import { NextResponse } from "next/server";
import { type AuthResponse, type LoginCredentials } from "@/lib/backend/auth";
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

function createCookieOptions(httpOnly: boolean, secure: boolean) {
  return {
    httpOnly,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function setSessionCookies(response: NextResponse, token: string, secure: boolean) {
  response.cookies.set("auth_token", token, createCookieOptions(true, secure));
  response.cookies.set("auth_user", "", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

function clearSessionCookies(response: NextResponse, secure: boolean) {
  response.cookies.set("auth_token", "", {
    ...createCookieOptions(true, secure),
    maxAge: 0,
  });
  response.cookies.set("auth_user", "", {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request: Request) {
  const secure = isSecureRequest(request);

  try {
    const credentials = (await request.json()) as LoginCredentials;
    const response = await postBackend<AuthResponse, LoginCredentials>("/auth/login", credentials);
    const requestedEmail = normalizeEmail(credentials.email);
    const returnedEmail = normalizeEmail(response.user.email);

    if (returnedEmail !== requestedEmail) {
      throw new Error("La session retournee ne correspond pas au compte demande.");
    }

    const nextResponse = NextResponse.json(response);
    setSessionCookies(nextResponse, response.token, secure);
    return nextResponse;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isRateLimited = /429\s+Too Many Requests|too many/i.test(rawMessage);
    const message =
      isRateLimited
        ? "Trop de tentatives de connexion. Réessayez dans quelques minutes."
        : /401\s+Unauthorized.*Invalid credentials/i.test(rawMessage)
        ? "Identifiants incorrects."
        : rawMessage
          ? rawMessage
          : "Identifiants incorrects.";

    const response = NextResponse.json(
      {
        error: message,
      },
      { status: isRateLimited ? 429 : 401 },
    );
    clearSessionCookies(response, secure);
    return response;
  }
}
