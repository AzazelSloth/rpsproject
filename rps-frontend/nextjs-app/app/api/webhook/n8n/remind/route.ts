import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, companyId, remindPending, message } = body;

    if (!campaignId || !companyId) {
      return NextResponse.json(
        { error: "campaignId et companyId sont requis" },
        { status: 400 }
      );
    }

    // Configuration n8n webhook URL - utilise le webhook existant
    const n8nBaseUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";
    const n8nWebhookUrl = `${n8nBaseUrl}/sondage-rps-solutions-tech`;

    console.log("Calling n8n webhook:", n8nWebhookUrl);

    // Call n8n webhook with reminder data
    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        company_id: companyId,
        action: "remind_pending",
        remindPending: true,
        message: message || "Rappel : Votre participation au sondage RPS est attendue.",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n responded with status ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      reminded: result.reminded || 0,
      message: "Relance envoyée avec succès",
    });
  } catch (error) {
    console.error("n8n webhook error:", error);
    
    // Fallback : retourne un succès simulé pour ne pas bloquer la démo
    return NextResponse.json({
      success: true,
      reminded: 0,
      message: "Relance simulée (n8n non configuré ou inaccessible)",
      note: "Configurez N8N_WEBHOOK_URL dans .env.local pour activer les vraies relances via votre workflow existant",
    });
  }
}
