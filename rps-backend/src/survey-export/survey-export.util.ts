import { createHmac } from 'crypto';
import { surveyExportStatuses } from './dto/survey-export.dto';

const SCALE_TYPES = new Set(['scale', 'rating', 'likert']);
const CHOICE_TYPES = new Set(['choice', 'multiple_choice', 'radio']);
const TEXT_TYPES = new Set(['text', 'free_text', 'textarea']);

const AGREEMENT_SCALE = [
  'pas du tout d accord',
  'plutot en desaccord',
  'ni d accord ni en desaccord',
  'plutot d accord',
  'tout a fait d accord',
];

const FREQUENCY_SCALE = [
  'jamais',
  'rarement',
  'parfois',
  'souvent',
  'tres souvent',
];

export function normalizeStoredQuestionType(type?: string | null) {
  return (type ?? '').trim().toLowerCase();
}

export function isClosedQuestionType(type?: string | null) {
  const normalizedType = normalizeStoredQuestionType(type);
  return SCALE_TYPES.has(normalizedType) || CHOICE_TYPES.has(normalizedType);
}

export function isTextQuestionType(type?: string | null) {
  return TEXT_TYPES.has(normalizeStoredQuestionType(type));
}

function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function matchesScale(options: string[] | null | undefined, expected: string[]) {
  if (!options || options.length !== expected.length) {
    return false;
  }

  return options.every(
    (option, index) => normalizeLabel(option) === expected[index],
  );
}

export function formatQuestionType(
  type?: string | null,
  options?: string[] | null,
) {
  const normalizedType = normalizeStoredQuestionType(type);

  if (SCALE_TYPES.has(normalizedType)) {
    if (matchesScale(options, AGREEMENT_SCALE)) {
      return 'Échelle A';
    }
    if (matchesScale(options, FREQUENCY_SCALE)) {
      return 'Échelle F';
    }
    return 'Échelle 1 à 5';
  }

  return normalizedType === 'multiple_choice'
    ? 'Choix multiple'
    : 'Choix simple';
}

export function formatExportAnswer(
  type: string | null | undefined,
  options: string[] | null | undefined,
  answer: string | null | undefined,
) {
  if (!answer) {
    return '';
  }

  if (SCALE_TYPES.has(normalizeStoredQuestionType(type)) && options?.length) {
    const numericValue = Number(answer);
    if (
      Number.isInteger(numericValue) &&
      numericValue >= 1 &&
      numericValue <= options.length
    ) {
      return options[numericValue - 1];
    }
  }

  return answer;
}

export function formatExportStatus(
  state: 'answered' | 'declined' | 'skipped' | 'indeterminate',
) {
  return surveyExportStatuses[state];
}

export function buildOpaqueRespondentReference(
  secret: string,
  campaignId: number,
  participationId: number,
) {
  const digest = createHmac('sha256', secret)
    .update(`campaign:${campaignId}:participation:${participationId}`)
    .digest('hex')
    .slice(0, 16)
    .toUpperCase();

  return `R-${digest}`;
}
