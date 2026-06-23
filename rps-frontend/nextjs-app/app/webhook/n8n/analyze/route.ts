import { NextResponse } from "next/server";
import { postServerBackend } from "@/lib/backend/server";

type AnalyzeResponse = {
  success: boolean;
  message: string;
};

function parseCampaignId(value: unknown) {
  const campaignId = Number(value);
  return Number.isInteger(campaignId) && campaignId > 0 ? campaignId : null;
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaignId = parseCampaignId(body?.campaignId ?? body?.campaign_id);
    const companyName = parseOptionalString(
      body?.companyName ?? body?.company_name,
    );

    if (!campaignId) {
      return NextResponse.json(
        { error: "L'identifiant de la campagne est necessaire." },
        { status: 400 },
      );
    }

    const path = companyName
      ? `/campaigns/${campaignId}/analyze-with-company`
      : `/campaigns/${campaignId}/analyze`;
    const result = companyName
      ? await postServerBackend<AnalyzeResponse, { company_name: string }>(path, {
          company_name: companyName,
        })
      : await postServerBackend<AnalyzeResponse, Record<string, never>>(path, {});

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis proxy error:", error);

    return NextResponse.json(
      {
        error: "Echec du lancement de l'analyse",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
