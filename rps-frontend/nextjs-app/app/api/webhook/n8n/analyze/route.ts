import { NextRequest, NextResponse } from "next/server";
import { getN8nWebhookUrl } from "@/lib/n8n/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, results } = body;

    if (!campaignId || !results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "campaignId et results (tableau) sont requis" },
        { status: 400 },
      );
    }

    const n8nWebhookUrl = getN8nWebhookUrl();

    console.log("Sending analysis data to n8n:", n8nWebhookUrl);

    const payload = {
      body: {
        body: results.map((employee: Record<string, unknown>) => ({
          Employeur: employee.employer || employee.employeur || "Entreprise",
          Email: employee.email || "",
          "Nom et Prenom": `${employee.firstName || employee.first_name || ""} ${
            employee.lastName || employee.last_name || ""
          }`.trim(),
          Fonction: employee.department || employee.title || employee.fonction || "",
          ...Object.fromEntries(
            Object.entries(employee)
              .filter(([key]) => /^Q\d+$/.test(key))
              .map(([key, value]) => [key, value?.toString() || ""]),
          ),
        })),
        campaign_id: campaignId,
        client_email: body.clientEmail || body.client_email || "",
      },
    };

    const response = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
      message: "Analyse envoyee a n8n avec succes",
      data: result,
    });
  } catch (error) {
    console.error("n8n analysis webhook error:", error);

    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        message: "Analyse simulee (n8n non configure)",
        note: "Configurez N8N_WEBHOOK_URL dans .env.local pour activer l'analyse via n8n",
      });
    }

    return NextResponse.json(
      {
        error: "Echec de l'envoi a n8n",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
