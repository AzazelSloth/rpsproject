import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api";
import { parseSurveyExportParams } from "@/lib/survey-exports/access";

function noStoreHeaders() {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
    "X-Content-Type-Options": "nosniff",
  };
}

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: noStoreHeaders() },
  );
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ campaignId: string; kind: string }>;
  },
) {
  const { campaignId: rawCampaignId, kind: rawKind } = await context.params;
  const exportParams = parseSurveyExportParams(rawCampaignId, rawKind);

  if (!exportParams) {
    return errorResponse("Export demandé invalide.", 400);
  }
  const { campaignId, kind } = exportParams;

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value?.trim();
  if (!token) {
    return errorResponse("Authentification requise.", 401);
  }

  try {
    const backendResponse = await fetch(
      getApiUrl(`/survey-exports/campaign/${campaignId}/${kind}`),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (!backendResponse.ok) {
      const message =
        backendResponse.status === 401
          ? "Authentification requise."
          : backendResponse.status === 403
            ? "Ce compte n'est pas autorisé à exporter les réponses."
            : backendResponse.status === 404
              ? "Ce sondage est introuvable."
              : "L'export CSV est temporairement indisponible.";
      return errorResponse(message, backendResponse.status);
    }

    const headers = new Headers(noStoreHeaders());
    headers.set("Content-Type", "text/csv; charset=utf-8");

    const contentDisposition = backendResponse.headers.get("content-disposition");
    if (contentDisposition?.startsWith("attachment;")) {
      headers.set("Content-Disposition", contentDisposition);
    } else {
      headers.set(
        "Content-Disposition",
        `attachment; filename="survey-${campaignId}-${kind}.csv"`,
      );
    }

    const historyHeader = backendResponse.headers.get("x-survey-export-history");
    if (historyHeader === "indeterminate") {
      headers.set("X-Survey-Export-History", historyHeader);
    }

    return new NextResponse(await backendResponse.arrayBuffer(), {
      status: 200,
      headers,
    });
  } catch {
    return errorResponse("L'export CSV est temporairement indisponible.", 503);
  }
}
