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

function setSessionCookies(response: NextResponse, token: string, secure: boolean) {
  response.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
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
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
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

function preventAuthResponseCaching(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
}

export async function POST(request: Request) {
  const secure = isSecureRequest(request);

  try {
    const credentials = (await request.json()) as RegisterCredentials;
    const response = await postBackend<AuthResponse, RegisterCredentials>("/auth/register", credentials);
    const nextResponse = NextResponse.json(response);

    setSessionCookies(nextResponse, response.token, secure);
    preventAuthResponseCaching(nextResponse);
    return nextResponse;
  } catch (error) {
    const response = NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Inscription indisponible pour ce compte.",
      },
      { status: 400 },
    );
    clearSessionCookies(response, secure);
    preventAuthResponseCaching(response);
    return response;
  }
}
