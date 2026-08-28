export const PREFER_NOT_TO_ANSWER = "Je préfère ne pas répondre";

export function isPreferNotToAnswer(answer?: string) {
  return answer === PREFER_NOT_TO_ANSWER;
}

export function togglePreferNotToAnswer(answer?: string) {
  return isPreferNotToAnswer(answer) ? "" : PREFER_NOT_TO_ANSWER;
}

export function buildSurveySubmissionAnswers(
  questionIds: string[],
  answers: Record<string, string>,
) {
  return questionIds
    .map((questionId) => ({
      questionId: Number(questionId),
      answer: isPreferNotToAnswer(answers[questionId])
        ? null
        : (answers[questionId] ?? "").trim(),
      responseState: isPreferNotToAnswer(answers[questionId])
        ? ("declined" as const)
        : ("answered" as const),
    }))
    .filter((entry) => entry.responseState === "declined" || entry.answer);
}
