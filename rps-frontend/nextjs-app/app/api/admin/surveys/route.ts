import { NextResponse } from "next/server";
import {
  deleteBackend,
  isBackendConfigured,
  patchBackend,
  postBackend,
} from "@/lib/backend/client";

type CreateCampaignPayload = {
  action: "createCampaign";
  companyId: number;
  title: string;
  startDate?: string;
  endDate?: string;
};

type UpdateCampaignPayload = {
  action: "updateCampaign";
  campaignId: number;
  title: string;
  startDate?: string;
  endDate?: string;
};

type CampaignStatusPayload = {
  action: "activateCampaign" | "terminateCampaign" | "archiveCampaign";
  campaignId: number;
};

type CreateQuestionPayload = {
  action: "createQuestion";
  campaignId: number;
  title: string;
  type: "scale" | "choice" | "text";
  orderIndex: number;
};

type UpdateQuestionPayload = {
  action: "updateQuestion";
  questionId: number;
  title: string;
  type: "scale" | "choice" | "text";
  orderIndex: number;
};

type DeleteQuestionPayload = {
  action: "deleteQuestion";
  questionId: number;
};

type ReorderQuestionsPayload = {
  action: "reorderQuestions";
  campaignId: number;
  items: Array<{
    questionId: number;
    orderIndex: number;
  }>;
};

type AdminSurveyPayload =
  | CreateCampaignPayload
  | UpdateCampaignPayload
  | CampaignStatusPayload
  | CreateQuestionPayload
  | UpdateQuestionPayload
  | DeleteQuestionPayload
  | ReorderQuestionsPayload;

export async function POST(request: Request) {
  const payload = (await request.json()) as AdminSurveyPayload;

  if (!isBackendConfigured()) {
    return NextResponse.json({ success: true, mode: "demo" });
  }

  try {
    switch (payload.action) {
      case "createCampaign": {
        const result = await postBackend("/campaigns", {
          company_id: payload.companyId,
          name: payload.title,
          start_date: payload.startDate || undefined,
          end_date: payload.endDate || undefined,
        });

        return NextResponse.json({ success: true, result });
      }
      case "updateCampaign": {
        const result = await patchBackend(`/campaigns/${payload.campaignId}`, {
          name: payload.title,
          start_date: payload.startDate || undefined,
          end_date: payload.endDate || undefined,
        });

        return NextResponse.json({ success: true, result });
      }
      case "activateCampaign":
      case "terminateCampaign":
      case "archiveCampaign": {
        const endpoint =
          payload.action === "activateCampaign"
            ? "activate"
            : payload.action === "terminateCampaign"
              ? "terminate"
              : "archive";
        const result = await postBackend(`/campaigns/${payload.campaignId}/${endpoint}`, {});

        return NextResponse.json({ success: true, result });
      }
      case "createQuestion": {
        const result = await postBackend("/questions", {
          campaign_id: payload.campaignId,
          question_text: payload.title,
          question_type: payload.type,
          rps_dimension: payload.type,
          order_index: payload.orderIndex,
        });

        return NextResponse.json({ success: true, result });
      }
      case "updateQuestion": {
        const result = await patchBackend(`/questions/${payload.questionId}`, {
          question_text: payload.title,
          question_type: payload.type,
          rps_dimension: payload.type,
          order_index: payload.orderIndex,
        });

        return NextResponse.json({ success: true, result });
      }
      case "deleteQuestion": {
        const result = await deleteBackend(`/questions/${payload.questionId}`);

        return NextResponse.json({ success: true, result });
      }
      case "reorderQuestions": {
        const result = await patchBackend(
          `/questions/campaign/${payload.campaignId}/reorder`,
          payload.items.map((item) => ({
            question_id: item.questionId,
            order_index: item.orderIndex,
          })),
        );

        return NextResponse.json({ success: true, result });
      }
      default:
        return NextResponse.json({ message: "Action non supportee." }, { status: 400 });
    }
  } catch {
    return NextResponse.json(
      { message: "La mutation campagne/question a echoue." },
      { status: 502 },
    );
  }
}
