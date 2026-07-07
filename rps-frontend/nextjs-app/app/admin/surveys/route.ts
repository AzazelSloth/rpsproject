import { NextResponse } from "next/server";
import {
  deleteServerBackend as deleteBackend,
  patchServerBackend as patchBackend,
  postServerBackend as postBackend,
} from "@/lib/backend/server";

type CreateCompanyPayload = {
  action: "createCompany";
  name: string;
};

type CreateCampaignPayload = {
  action: "createCampaign";
  companyId: number;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  sourceCampaignId?: number | null;
};

type UpdateCampaignPayload = {
  action: "updateCampaign";
  campaignId: number;
  companyId: number;
  title: string;
  description?: string;
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
  sectionId?: number | null;
  title: string;
  type: "scale" | "choice" | "text";
  options?: string[];
  orderIndex: number;
};

type UpdateQuestionPayload = {
  action: "updateQuestion";
  questionId: number;
  sectionId?: number | null;
  title: string;
  type: "scale" | "choice" | "text";
  options?: string[];
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
    sectionId?: number | null;
    orderIndex: number;
  }>;
};

type CreateSectionPayload = {
  action: "createSection";
  campaignId: number;
  title: string;
  description?: string;
  orderIndex: number;
};

type UpdateSectionPayload = {
  action: "updateSection";
  sectionId: number;
  title: string;
  description?: string;
  orderIndex: number;
};

type DeleteSectionPayload = {
  action: "deleteSection";
  sectionId: number;
};

type ReorderSectionsPayload = {
  action: "reorderSections";
  campaignId: number;
  items: Array<{
    sectionId: number;
    orderIndex: number;
  }>;
};

type AdminSurveyPayload =
  | CreateCompanyPayload
  | CreateCampaignPayload
  | UpdateCampaignPayload
  | CampaignStatusPayload
  | CreateQuestionPayload
  | UpdateQuestionPayload
  | DeleteQuestionPayload
  | ReorderQuestionsPayload
  | CreateSectionPayload
  | UpdateSectionPayload
  | DeleteSectionPayload
  | ReorderSectionsPayload;

export async function POST(request: Request) {
  const payload = (await request.json()) as AdminSurveyPayload;

  try {
    switch (payload.action) {
      case "createCompany": {
        const result = await postBackend("/companies", {
          name: payload.name,
        });

        return NextResponse.json({ success: true, result });
      }
      case "createCampaign": {
        const result = await postBackend("/campaigns", {
          company_id: payload.companyId,
          name: payload.title,
          description: payload.description || undefined,
          start_date: payload.startDate || undefined,
          end_date: payload.endDate || undefined,
          source_campaign_id: payload.sourceCampaignId || undefined,
        });

        return NextResponse.json({ success: true, result });
      }
      case "updateCampaign": {
        const result = await patchBackend(`/campaigns/${payload.campaignId}`, {
          company_id: payload.companyId,
          name: payload.title,
          description: payload.description || undefined,
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
          section_id: payload.sectionId ?? undefined,
          question_text: payload.title,
          question_type: payload.type,
          rps_dimension: payload.type,
          choice_options: payload.type === "choice" ? payload.options : undefined,
          order_index: payload.orderIndex,
        });

        return NextResponse.json({ success: true, result });
      }
      case "updateQuestion": {
        const result = await patchBackend(`/questions/${payload.questionId}`, {
          section_id: payload.sectionId ?? null,
          question_text: payload.title,
          question_type: payload.type,
          rps_dimension: payload.type,
          choice_options: payload.type === "choice" ? payload.options : undefined,
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
            section_id: item.sectionId ?? null,
            order_index: item.orderIndex,
          })),
        );

        return NextResponse.json({ success: true, result });
      }
      case "createSection": {
        const result = await postBackend("/questions/sections", {
          campaign_id: payload.campaignId,
          title: payload.title,
          description: payload.description || undefined,
          order_index: payload.orderIndex,
        });

        return NextResponse.json({ success: true, result });
      }
      case "updateSection": {
        const result = await patchBackend(`/questions/sections/${payload.sectionId}`, {
          title: payload.title,
          description: payload.description || undefined,
          order_index: payload.orderIndex,
        });

        return NextResponse.json({ success: true, result });
      }
      case "deleteSection": {
        const result = await deleteBackend(`/questions/sections/${payload.sectionId}`);

        return NextResponse.json({ success: true, result });
      }
      case "reorderSections": {
        const result = await patchBackend(
          `/questions/sections/campaign/${payload.campaignId}/reorder`,
          payload.items.map((item) => ({
            section_id: item.sectionId,
            order_index: item.orderIndex,
          })),
        );

        return NextResponse.json({ success: true, result });
      }
      default:
        return NextResponse.json({ message: "Action non supportée." }, { status: 400 });
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "La mutation sondage/question a échoué.";

    return NextResponse.json(
      { message },
      { status: 502 },
    );
  }
}
