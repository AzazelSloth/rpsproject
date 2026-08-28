export type StatisticalResponse = {
  answer: string | null;
  responseState?: string | null;
};

export function isAnsweredResponseState(state?: string | null) {
  return state !== "declined";
}

export function getValidScaleResponseValues(
  responses: StatisticalResponse[],
) {
  return responses
    .filter((response) => isAnsweredResponseState(response.responseState))
    .map((response) => Number(response.answer))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
}
