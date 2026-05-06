import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, companyId, message } = body;

    if (!campaignId || !companyId) {
      return NextResponse.json(
        { error: "campaignId et companyId sont requis" },
        { status: 400 },
      );
    }

    // Forward l'appel vers le backend (sendReminders endpoint)
    const backendUrl = getApiUrl(`/campaign-participants/campaign/${campaignId}/remind`);

    // Récupérer le token JWT depuis la requête entrante pour le forward
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: "Non autorisé – token JWT manquant" },
        { status: 401 },
      );
    }

    console.log("Forwarding remind request to backend:", backendUrl);

    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify({
        minimum_days_since_invitation: 0,
        force: true,
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      throw new Error(`Backend error ${backendResponse.status}: ${errorText}`);
    }

    const result = await backendResponse.json();

    return NextResponse.json({
      success: true,
      reminded: result.reminded_count || 0,
      message: "Relances envoyees avec succes",
      data: result,
    });
  } catch (error) {
    console.error("Remind forwarding error:", error);

    return NextResponse.json({
      success: false,
      reminded: 0,
      error: "Echec de l'envoi des relances",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    }, { status: 500 });
  }
}
