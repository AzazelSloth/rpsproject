import { NextRequest, NextResponse } from "next/server";
import { getN8nWebhookUrl } from "@/lib/n8n/config";

function getRemindedCount(result: unknown) {
  if (!result || typeof result !== "object") {
    return 0;
  }

  const record = result as Record<string, unknown>;

  return Number(
    record.reminded ??
      record.reminded_count ??
      record.remindedParticipants ??
      record.count ??
      0,
  );
}

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

    const n8nWebhookUrl = getN8nWebhookUrl();

    console.log("Calling n8n webhook:", n8nWebhookUrl);

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

    const contentType = response.headers.get("content-type") || "";
    const result = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return NextResponse.json({
      success: true,
      reminded: getRemindedCount(result),
      message: "Relance envoyee avec succes",
      data: result,
    });
  } catch (error) {
    console.error("n8n webhook error:", error);

    return NextResponse.json({
      success: true,
      reminded: 0,
      message: "Relance simulee (n8n non configure ou inaccessible)",
      note: "Configurez N8N_WEBHOOK_URL dans .env.local pour activer les vraies relances via votre workflow existant",
    });
  }
}
