import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, companyId, results } = body;

    if (!campaignId || !results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "campaignId et results (tableau) sont requis" },
        { status: 400 }
      );
    }

    // Configuration n8n webhook URL
    const n8nBaseUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678";
    const n8nWebhookUrl = `${n8nBaseUrl}/webhook/sondage-rps-solutions-tech`;

    console.log("Sending analysis data to n8n:", n8nWebhookUrl);

    // Formatage des données pour correspondre à ce que n8n attend
    // Le workflow n8n attend: items[0].json.body.body
    const payload = {
      body: {
        body: results.map((employee: any) => ({
          Employeur: employee.employer || employee.employeur || "Entreprise",
          Email: employee.email || "",
          "Nom et Prenom": `${employee.firstName || employee.first_name || ""} ${employee.lastName || employee.last_name || ""}`.trim(),
          Fonction: employee.department || employee.title || employee.fonction || "",
          // Ajout des réponses Q1 à Q28
          ...Object.fromEntries(
            Object.entries(employee)
              .filter(([key]) => key.match(/^Q\d+$/))
              .map(([key, value]) => [key, value?.toString() || ""])
          ),
        })),
        campaign_id: campaignId,
        client_email: body.clientEmail || body.client_email || "",
      },
    };

    // Appel au webhook n8n
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

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: "Analyse envoyée à n8n avec succès",
      data: result,
    });
  } catch (error) {
    console.error("n8n analysis webhook error:", error);

    // Fallback pour le développement
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        success: true,
        message: "Analyse simulée (n8n non configuré)",
        note: "Configurez N8N_WEBHOOK_URL dans .env.local pour activer l'analyse via n8n",
      });
    }

    return NextResponse.json(
      {
        error: "Échec de l'envoi à n8n",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
