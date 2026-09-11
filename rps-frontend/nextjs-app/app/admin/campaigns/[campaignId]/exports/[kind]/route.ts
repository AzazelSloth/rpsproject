import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api";
import { parseSurveyExportParams, parseSurveyExportFormat, SURVEY_EXPORT_CONTENT_TYPES } from "@/lib/survey-exports/access";

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
  request: Request,
  context: {
    params: Promise<{ campaignId: string; kind: string }>;
  },
) {
  const { campaignId: rawCampaignId, kind: rawKind } = await context.params;
  const exportParams = parseSurveyExportParams(rawCampaignId, rawKind);
  const formats = new URL(request.url).searchParams.getAll("format");
  const format = parseSurveyExportFormat(formats[0] ?? null);

  if (!exportParams || !format || formats.length > 1) {
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
      getApiUrl(`/survey-exports/campaign/${campaignId}/${kind}?format=${format}`),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );

    if (!backendResponse.ok) {
      if (backendResponse.status === 400 && format === "xlsx") {
        const body = await backendResponse.json().catch(() => null);
        if (body?.code === "SURVEY_EXCEL_LIMIT_EXCEEDED") {
          return errorResponse(
            "Ces réponses dépassent les limites du format Excel. Choisissez CSV pour télécharger leur contenu intégral.",
            400,
          );
        }
      }
      const message =
        backendResponse.status === 401
          ? "Authentification requise."
          : backendResponse.status === 403
            ? "Ce compte n'est pas autorisé à exporter les réponses."
            : backendResponse.status === 404
              ? "Ce sondage est introuvable."
              : "L'export est temporairement indisponible.";
      return errorResponse(message, backendResponse.status);
    }

    const contentType = backendResponse.headers.get("content-type")?.split(";")[0].trim();
    if (contentType !== SURVEY_EXPORT_CONTENT_TYPES[format]) {
      return errorResponse("Le serveur n'a pas retourné le fichier demandé.", 502);
    }
    const headers = new Headers(noStoreHeaders());
    headers.set("Content-Type", format === "csv" ? "text/csv; charset=utf-8" : contentType);

    const contentDisposition = backendResponse.headers.get("content-disposition");
    if (contentDisposition?.startsWith("attachment;")) {
      headers.set("Content-Disposition", contentDisposition);
    } else {
      headers.set(
        "Content-Disposition",
        `attachment; filename="survey-${campaignId}-${kind}.${format}"`,
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
    return errorResponse("L'export est temporairement indisponible.", 503);
  }
}
