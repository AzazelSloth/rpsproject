import { NextResponse } from "next/server";
import { type AuthMessageResponse, type ForgotPasswordCredentials } from "@/lib/backend/auth";
import { postBackend } from "@/lib/backend/client";

function preventAuthResponseCaching(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
}

export async function POST(request: Request) {
  try {
    const credentials = (await request.json()) as ForgotPasswordCredentials;
    const response = await postBackend<AuthMessageResponse, ForgotPasswordCredentials>(
      "/auth/forgot-password",
      credentials,
    );
    const nextResponse = NextResponse.json(response);
    preventAuthResponseCaching(nextResponse);
    return nextResponse;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isRateLimited = /429\s+Too Many Requests|too many/i.test(rawMessage);
    const isUnavailable = /503|indisponible|Configuration email manquante/i.test(rawMessage);
    const message = isRateLimited
      ? "Trop de demandes de reinitialisation. Reessayez dans quelques minutes."
      : isUnavailable
        ? "La reinitialisation de mot de passe est temporairement indisponible."
        : rawMessage || "La demande de reinitialisation a echoue.";

    const response = NextResponse.json(
      { error: message },
      { status: isRateLimited ? 429 : isUnavailable ? 503 : 400 },
    );
    preventAuthResponseCaching(response);
    return response;
  }
}
