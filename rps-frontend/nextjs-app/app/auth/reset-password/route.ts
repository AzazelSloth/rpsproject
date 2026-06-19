import { NextResponse } from "next/server";
import { type AuthMessageResponse, type ResetPasswordCredentials } from "@/lib/backend/auth";
import { postBackend } from "@/lib/backend/client";

function preventAuthResponseCaching(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
}

export async function POST(request: Request) {
  try {
    const credentials = (await request.json()) as ResetPasswordCredentials;
    const response = await postBackend<AuthMessageResponse, ResetPasswordCredentials>(
      "/auth/reset-password",
      credentials,
    );
    const nextResponse = NextResponse.json(response);
    preventAuthResponseCaching(nextResponse);
    return nextResponse;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    const isRateLimited = /429\s+Too Many Requests|too many/i.test(rawMessage);
    const isInvalidToken = /401|invalide ou expire/i.test(rawMessage);
    const message = isRateLimited
      ? "Trop de tentatives de reinitialisation. Reessayez dans quelques minutes."
      : isInvalidToken
        ? "Le lien de reinitialisation est invalide ou expire."
        : rawMessage || "La mise a jour du mot de passe a echoue.";

    const response = NextResponse.json(
      { error: message },
      { status: isRateLimited ? 429 : isInvalidToken ? 400 : 400 },
    );
    preventAuthResponseCaching(response);
    return response;
  }
}
