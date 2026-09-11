export const surveyExportStatuses = {
  answered: 'Répondu',
  declined: 'Je préfère ne pas répondre',
  skipped: 'Sauté',
  indeterminate: 'Indéterminé',
} as const;

export class ClosedSurveyExportRowDto {
  respondent!: string;
  section!: string;
  question!: string;
  questionType!: string;
  answer!: string;
  status!: string;
}

export class TextSurveyExportRowDto {
  respondent!: string;
  section!: string;
  question!: string;
  textAnswer!: string;
  status!: string;
}

export type SurveyExportFile = {
  content: string;
  filename: string;
  containsIndeterminateHistory: boolean;
};
