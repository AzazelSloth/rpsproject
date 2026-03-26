import { NextResponse } from "next/server";
import { isBackendConfigured, postBackend } from "@/lib/backend/client";

type SurveySubmissionPayload = {
  participantToken?: string | null;
  employeeId?: number | null;
  answers: Array<{
    questionId: number;
    answer: string;
  }>;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as SurveySubmissionPayload;

  if ((!payload.employeeId && !payload.participantToken) || !payload.answers?.length) {
    return NextResponse.json(
      { message: "participantToken ou employeeId, et answers sont requis." },
      { status: 400 },
    );
  }

  if (!isBackendConfigured()) {
    return NextResponse.json({ success: true, mode: "demo" });
  }

  try {
    if (payload.participantToken) {
      await postBackend(`/campaign-participants/token/${payload.participantToken}/submit`, {
        responses: payload.answers.map((answer) => ({
          question_id: answer.questionId,
          answer: answer.answer,
        })),
      });

      return NextResponse.json({ success: true, mode: "backend-token" });
    }

    await Promise.all(
      payload.answers.map((answer) =>
        postBackend("/responses", {
          employee_id: payload.employeeId,
          question_id: answer.questionId,
          answer: answer.answer,
        }),
      ),
    );

    return NextResponse.json({ success: true, mode: "backend" });
  } catch {
    return NextResponse.json(
      { message: "La soumission vers le backend NestJS a echoue." },
      { status: 502 },
    );
  }
}
