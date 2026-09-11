import {
  buildOpaqueRespondentReference,
  formatExportAnswer,
  formatExportStatus,
  formatQuestionType,
  isClosedQuestionType,
  isTextQuestionType,
} from './survey-export.util';

describe('Survey export formatting', () => {
  const agreementOptions = [
    "Pas du tout d'accord",
    'Plutôt en désaccord',
    "Ni d'accord ni en désaccord",
    "Plutôt d'accord",
    "Tout à fait d'accord",
  ];
  const frequencyOptions = [
    'Jamais',
    'Rarement',
    'Parfois',
    'Souvent',
    'Très souvent',
  ];

  it('separates supported closed and text question types', () => {
    expect(isClosedQuestionType('scale')).toBe(true);
    expect(isClosedQuestionType('likert')).toBe(true);
    expect(isClosedQuestionType('choice')).toBe(true);
    expect(isClosedQuestionType('multiple_choice')).toBe(true);
    expect(isClosedQuestionType('text')).toBe(false);
    expect(isClosedQuestionType('custom')).toBe(false);
    expect(isTextQuestionType('text')).toBe(true);
    expect(isTextQuestionType('free_text')).toBe(true);
    expect(isTextQuestionType('custom')).toBe(false);
  });

  it('identifies agreement, frequency and generic scales from their snapshot', () => {
    expect(formatQuestionType('scale', agreementOptions)).toBe('Échelle A');
    expect(formatQuestionType('scale', frequencyOptions)).toBe('Échelle F');
    expect(formatQuestionType('scale', ['1', '2', '3', '4', '5'])).toBe(
      'Échelle 1 à 5',
    );
  });

  it('renders a scale answer with the immutable option label', () => {
    expect(formatExportAnswer('scale', frequencyOptions, '4')).toBe('Souvent');
    expect(formatExportAnswer('choice', ['Oui', 'Non'], 'Oui')).toBe('Oui');
  });

  it('uses the required French response statuses', () => {
    expect(formatExportStatus('answered')).toBe('Répondu');
    expect(formatExportStatus('declined')).toBe(
      'Je préfère ne pas répondre',
    );
    expect(formatExportStatus('skipped')).toBe('Sauté');
    expect(formatExportStatus('indeterminate')).toBe('Indéterminé');
  });

  it('builds stable campaign-scoped references without exposing identifiers', () => {
    const secret = 'a-dedicated-secret-that-is-long-enough';
    const first = buildOpaqueRespondentReference(secret, 12, 34);

    expect(first).toMatch(/^R-[A-F0-9]{16}$/);
    expect(first).toBe(buildOpaqueRespondentReference(secret, 12, 34));
    expect(first).not.toBe(buildOpaqueRespondentReference(secret, 13, 34));
  });
});
