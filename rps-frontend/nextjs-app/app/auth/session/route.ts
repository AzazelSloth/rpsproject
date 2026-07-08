import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type User } from "@/lib/backend/auth";
import { getBackendItem } from "@/lib/backend/client";

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

function isAuthenticationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  return /\b(401|403)\b|Invalid token|Missing authorization token|User not found|Session user mismatch|autorise/i.test(
    message,
  );
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value?.trim();

  if (!token) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    preventAuthResponseCaching(response);
    return response;
  }

  try {
    const user = await getBackendItem<User>("/auth/me", token);
    const response = NextResponse.json({ user });
    preventAuthResponseCaching(response);
    return response;
  } catch (error) {
    if (!isAuthenticationError(error)) {
      const response = NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "La verification de session est temporairement indisponible.",
        },
        { status: 503 },
      );
      preventAuthResponseCaching(response);
      return response;
    }

    const response = NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Session expirée ou invalide.",
      },
      { status: 401 },
    );
    clearSessionCookies(response, isSecureRequest(request));
    preventAuthResponseCaching(response);
    return response;
  }
}
