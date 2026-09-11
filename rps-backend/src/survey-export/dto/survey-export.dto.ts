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

export type SurveyExportFile<TContent = string> = {
  content: TContent;
  filename: string;
  containsIndeterminateHistory: boolean;
};

export const SURVEY_EXCEL_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
