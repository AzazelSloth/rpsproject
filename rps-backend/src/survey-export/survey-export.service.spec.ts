import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { SurveySubmissionItemState } from '../campaign-participant/survey-submission-item.entity';
import { SurveyResponseState } from '../response/response.entity';
import { SurveyExportService } from './survey-export.service';

describe('SurveyExportService', () => {
  const originalSecret = process.env.SURVEY_EXPORT_PSEUDONYM_SECRET;
  const campaignRepository = { findOne: jest.fn(), save: jest.fn() };
  const participantRepository = { find: jest.fn(), save: jest.fn() };
  const submissionItemRepository = { find: jest.fn(), save: jest.fn() };
  const responseRepository = { find: jest.fn(), save: jest.fn() };
  let service: SurveyExportService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SURVEY_EXPORT_PSEUDONYM_SECRET =
      'survey-export-tests-use-a-dedicated-secret';
    campaignRepository.findOne.mockResolvedValue({ id: 77 });
    participantRepository.find.mockResolvedValue([
      {
        id: 101,
        completed_at: new Date('2026-09-11T10:00:00Z'),
        employee: {
          id: 501,
          first_name: 'Private',
          last_name: 'Person',
          email: 'private@example.com',
          department: 'Private department',
        },
      },
    ]);
    submissionItemRepository.find.mockResolvedValue([]);
    responseRepository.find.mockResolvedValue([]);
    service = new SurveyExportService(
      campaignRepository as never,
      participantRepository as never,
      submissionItemRepository as never,
      responseRepository as never,
    );
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.SURVEY_EXPORT_PSEUDONYM_SECRET;
    } else {
      process.env.SURVEY_EXPORT_PSEUDONYM_SECRET = originalSecret;
    }
  });

  it('exports answered, declined and skipped closed snapshot rows in order', async () => {
    submissionItemRepository.find.mockResolvedValue([
      submissionItem({
        original_question_id: 13,
        question_text: 'Question sautée',
        question_type: 'scale',
        section_title: 'Section B',
        section_order: 2,
        question_order: 1,
        choice_options: ['1', '2', '3', '4', '5'],
        response_state: SurveySubmissionItemState.SKIPPED,
      }),
      submissionItem({
        original_question_id: 11,
        question_text: 'Charge fréquente',
        question_type: 'scale',
        section_title: 'Charge de travail',
        section_order: 1,
        question_order: 1,
        choice_options: [
          'Jamais',
          'Rarement',
          'Parfois',
          'Souvent',
          'Très souvent',
        ],
        answer: '4',
        response_state: SurveySubmissionItemState.ANSWERED,
      }),
      submissionItem({
        original_question_id: 12,
        question_text: 'Choix confidentiel',
        question_type: 'choice',
        section_title: 'Charge de travail',
        section_order: 1,
        question_order: 2,
        choice_options: ['Oui', 'Non'],
        response_state: SurveySubmissionItemState.DECLINED,
      }),
      submissionItem({
        original_question_id: 14,
        question_text: 'Commentaire',
        question_type: 'text',
        section_title: 'Section B',
        section_order: 2,
        question_order: 2,
        answer: 'Texte exclu du fichier fermé',
        response_state: SurveySubmissionItemState.ANSWERED,
      }),
    ]);

    const result = await service.exportClosedQuestions(77);

    expect(result.containsIndeterminateHistory).toBe(false);
    expect(result.content).toContain('Échelle F');
    expect(result.content).toContain('Souvent');
    expect(result.content).toContain('Répondu');
    expect(result.content).toContain('Je préfère ne pas répondre');
    expect(result.content).toContain('Sauté');
    expect(result.content).not.toContain('Texte exclu du fichier fermé');
    expect(result.content.indexOf('Charge fréquente')).toBeLessThan(
      result.content.indexOf('Choix confidentiel'),
    );
    expect(result.content.indexOf('Choix confidentiel')).toBeLessThan(
      result.content.indexOf('Question sautée'),
    );
  });

  it('exports text safely without copying employee identity fields', async () => {
    submissionItemRepository.find.mockResolvedValue([
      submissionItem({
        original_question_id: 21,
        question_text: 'Une "question"\naccentuée',
        question_type: 'text',
        section_title: 'Expression libre',
        section_order: 3,
        question_order: 1,
        answer: '=HYPERLINK("https://example.test")',
        response_state: SurveySubmissionItemState.ANSWERED,
      }),
    ]);

    const result = await service.exportTextQuestions(77);

    expect(result.content).toContain('Une ""question""\naccentuée');
    expect(result.content).toContain("'=HYPERLINK(");
    expect(result.content).not.toContain('Private');
    expect(result.content).not.toContain('private@example.com');
    expect(result.content).not.toContain('Private department');
    expect(result.content).not.toContain('501');
    expect(result.content).not.toContain('101');
  });

  it('marks legacy rows indeterminate without synthesizing skipped answers', async () => {
    responseRepository.find.mockResolvedValue([
      {
        id: 90,
        answer: 'Ancienne réponse',
        response_state: SurveyResponseState.ANSWERED,
        employee: { id: 501 },
        question: {
          id: 30,
          question_text: 'Question historique',
          question_type: 'text',
          order_index: 4,
          choice_options: null,
          section: { id: 3, title: 'Historique', order_index: 2 },
        },
      },
    ]);

    const result = await service.exportTextQuestions(77);

    expect(result.containsIndeterminateHistory).toBe(true);
    expect(result.content).toContain('Ancienne réponse');
    expect(result.content).toContain('Indéterminé');
    expect(result.content).not.toContain('Sauté');
    expect(result.filename).toContain('historique-indetermine');
    const historicalFindCalls = responseRepository.find.mock
      .calls as unknown as Array<
      [{ where: { question: { campaign: { id: number } } } }]
    >;
    const historicalFindOptions = historicalFindCalls[0][0];
    expect(historicalFindOptions.where.question.campaign.id).toBe(77);
  });

  it('warns about a legacy submission even when it has no exportable response', async () => {
    const result = await service.exportClosedQuestions(77);

    expect(result.containsIndeterminateHistory).toBe(true);
    expect(result.content).not.toContain('Sauté');
  });

  it('does not guess whether an unknown historical question type is text or closed', async () => {
    responseRepository.find.mockResolvedValue([
      {
        id: 91,
        answer: 'Valeur inconnue',
        response_state: SurveyResponseState.ANSWERED,
        employee: { id: 501 },
        question: {
          id: 31,
          question_text: 'Type historique inconnu',
          question_type: 'custom',
          order_index: 5,
          choice_options: null,
          section: null,
        },
      },
    ]);

    const [closedResult, textResult] = await Promise.all([
      service.exportClosedQuestions(77),
      service.exportTextQuestions(77),
    ]);

    expect(closedResult.content).not.toContain('Valeur inconnue');
    expect(textResult.content).not.toContain('Valeur inconnue');
    expect(closedResult.containsIndeterminateHistory).toBe(true);
    expect(textResult.containsIndeterminateHistory).toBe(true);
  });

  it('does not mutate campaigns, participations, submission items or responses', async () => {
    await service.exportClosedQuestions(77);

    expect(campaignRepository.save).not.toHaveBeenCalled();
    expect(participantRepository.save).not.toHaveBeenCalled();
    expect(submissionItemRepository.save).not.toHaveBeenCalled();
    expect(responseRepository.save).not.toHaveBeenCalled();
  });

  it('returns headers only when the campaign has no completed submission', async () => {
    participantRepository.find.mockResolvedValue([]);

    const result = await service.exportClosedQuestions(77);

    expect(result.content).toBe(
      '\uFEFFsep=;\r\n"Répondant";"Section";"Question";"Type de question";"Réponse";"Statut"\r\n',
    );
    expect(submissionItemRepository.find).not.toHaveBeenCalled();
  });

  it('fails without a dedicated pseudonym secret', async () => {
    delete process.env.SURVEY_EXPORT_PSEUDONYM_SECRET;

    await expect(service.exportTextQuestions(77)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns not found before querying response data for another campaign', async () => {
    campaignRepository.findOne.mockResolvedValue(null);

    await expect(service.exportClosedQuestions(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(participantRepository.find).not.toHaveBeenCalled();
    expect(responseRepository.find).not.toHaveBeenCalled();
  });
});

function submissionItem(overrides: Record<string, unknown>) {
  return {
    id: 1,
    participation: { id: 101 },
    original_question_id: 1,
    question_text: 'Question',
    question_type: 'text',
    section_title: null,
    section_order: null,
    question_order: 0,
    choice_options: null,
    answer: null,
    response_state: SurveySubmissionItemState.SKIPPED,
    created_at: new Date('2026-09-11T10:00:00Z'),
    ...overrides,
  };
}
