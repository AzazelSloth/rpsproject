/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Campaign } from '../campaign/campaign.entity';
import { Employee } from '../employee/employee.entity';
import { SendGridMailService } from '../email/sendgrid-mail.service';
import { Question } from '../question/question.entity';
import {
  SurveyResponse,
  SurveyResponseState,
} from '../response/response.entity';
import {
  CampaignParticipant,
  CampaignParticipantStatus,
} from './campaign-participant.entity';
import { CampaignParticipantService } from './campaign-participant.service';
import {
  SurveySubmissionItem,
  SurveySubmissionItemState,
} from './survey-submission-item.entity';

describe('CampaignParticipantService survey submission', () => {
  let service: CampaignParticipantService;
  let participantRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
  };
  let questionRepository: { find: jest.Mock };
  let responseRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let submissionItemRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let employeeRepository: { save: jest.Mock };
  let campaignRepository: { findOne: jest.Mock };
  let participant: CampaignParticipant;

  beforeEach(async () => {
    const visibleSection = {
      id: 41,
      title: 'Section visible',
      description: 'Description visible',
      order_index: 1,
      is_visible: true,
      created_at: new Date('2025-01-01T00:00:00.000Z'),
    };
    const question = {
      id: 31,
      question_text: 'Question originale',
      question_type: 'scale',
      rps_dimension: 'Charge',
      order_index: 2,
      choice_options: ['1', '2', '3', '4', '5'],
      created_at: new Date('2025-01-02T00:00:00.000Z'),
      section: visibleSection,
      campaign: { id: 12 },
    } as Question;
    participant = {
      id: 7,
      participation_token: 'participant-token',
      completed_at: null,
      status: CampaignParticipantStatus.PENDING,
      draft: null,
      draft_revision: 0,
      questionnaire_snapshot: null,
      campaign: {
        id: 12,
        name: 'Survey',
        introduction_text: null,
        conclusion_text: null,
        status: 'active',
        start_date: null,
        end_date: null,
        company: { id: 5, name: 'Company' },
        questions: [question],
        question_sections: [visibleSection],
      },
      employee: {
        id: 21,
        first_name: 'Test',
        last_name: 'Employee',
        email: 'test@example.com',
        department: null,
        status: 'PENDING',
        deleted_at: null,
      },
    } as CampaignParticipant;
    participant.questionnaire_snapshot = {
      version: 1,
      captured_at: '2025-01-04T00:00:00.000Z',
      sections: [
        {
          id: visibleSection.id,
          title: visibleSection.title,
          description: visibleSection.description,
          order_index: visibleSection.order_index,
          is_visible: true,
          created_at: visibleSection.created_at.toISOString(),
        },
      ],
      questions: [
        {
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          rps_dimension: question.rps_dimension,
          order_index: question.order_index,
          choice_options: [...(question.choice_options ?? [])],
          created_at: question.created_at.toISOString(),
          section: {
            id: visibleSection.id,
            title: visibleSection.title,
            description: visibleSection.description,
            order_index: visibleSection.order_index,
            is_visible: true,
            created_at: visibleSection.created_at.toISOString(),
          },
        },
      ],
    };

    participantRepository = {
      findOne: jest.fn().mockResolvedValue(participant),
      find: jest.fn().mockResolvedValue([participant]),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    questionRepository = {
      find: jest.fn().mockResolvedValue([question]),
    };
    responseRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    submissionItemRepository = {
      create: jest.fn().mockImplementation((value: unknown) => value),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    employeeRepository = {
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    campaignRepository = { findOne: jest.fn() };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === CampaignParticipant) return participantRepository;
        if (entity === Question) return questionRepository;
        if (entity === SurveyResponse) return responseRepository;
        if (entity === SurveySubmissionItem) return submissionItemRepository;
        if (entity === Employee) return employeeRepository;
        throw new Error('Unexpected repository');
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (transactionManager: typeof manager) => unknown) =>
          callback(manager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignParticipantService,
        {
          provide: getRepositoryToken(CampaignParticipant),
          useValue: participantRepository,
        },
        {
          provide: getRepositoryToken(SurveyResponse),
          useValue: responseRepository,
        },
        {
          provide: getRepositoryToken(Question),
          useValue: questionRepository,
        },
        {
          provide: getRepositoryToken(Employee),
          useValue: employeeRepository,
        },
        {
          provide: getRepositoryToken(Campaign),
          useValue: campaignRepository,
        },
        { provide: DataSource, useValue: dataSource },
        { provide: SendGridMailService, useValue: {} },
      ],
    }).compile();

    service = module.get(CampaignParticipantService);
  });

  it('enregistre explicitement un refus sans texte de réponse', async () => {
    const result = await service.submitByToken('participant-token', {
      responses: [
        {
          question_id: 31,
          response_state: 'declined',
        },
      ],
    });

    expect(responseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        answer: null,
        response_state: SurveyResponseState.DECLINED,
      }),
    );
    expect(responseRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        answer: null,
        response_state: SurveyResponseState.DECLINED,
      }),
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        submitted: true,
        response_count: 1,
        answered_response_count: 0,
        declined_response_count: 1,
        skipped_response_count: 0,
      }),
    );
    expect(submissionItemRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        original_question_id: 31,
        answer: null,
        response_state: SurveySubmissionItemState.DECLINED,
      }),
    ]);
    expect(participantRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CampaignParticipantStatus.COMPLETED,
        completed_at: expect.any(Date),
      }),
    );
  });

  it('distingue une réponse, un refus et une question vide', async () => {
    participant.campaign.questions = [
      participant.campaign.questions[0],
      {
        ...participant.campaign.questions[0],
        id: 32,
        question_text: 'Question refusée',
        order_index: 3,
      },
      {
        ...participant.campaign.questions[0],
        id: 33,
        question_text: 'Question sautée',
        order_index: 4,
      },
    ];
    participant.questionnaire_snapshot!.questions =
      participant.campaign.questions.map((question) => ({
        id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        rps_dimension: question.rps_dimension,
        order_index: question.order_index,
        choice_options: question.choice_options
          ? [...question.choice_options]
          : null,
        section: participant.questionnaire_snapshot!.sections[0],
      }));
    questionRepository.find.mockResolvedValueOnce([
      { id: 31, campaign: { id: 12 } },
      { id: 32, campaign: { id: 12 } },
    ]);

    const result = await service.submitByToken('participant-token', {
      responses: [
        { question_id: 31, answer: '4', response_state: 'answered' },
        { question_id: 32, response_state: 'declined' },
      ],
    });

    expect(responseRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        answer: '4',
        response_state: SurveyResponseState.ANSWERED,
      }),
      expect.objectContaining({
        answer: null,
        response_state: SurveyResponseState.DECLINED,
      }),
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        response_count: 2,
        answered_response_count: 1,
        declined_response_count: 1,
        skipped_response_count: 1,
      }),
    );
    expect(submissionItemRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        original_question_id: 31,
        answer: '4',
        response_state: SurveySubmissionItemState.ANSWERED,
      }),
      expect.objectContaining({
        original_question_id: 32,
        answer: null,
        response_state: SurveySubmissionItemState.DECLINED,
      }),
      expect.objectContaining({
        original_question_id: 33,
        answer: null,
        response_state: SurveySubmissionItemState.SKIPPED,
      }),
    ]);
  });

  it('finalise une soumission entièrement vide sans créer de réponse historique', async () => {
    const result = await service.submitByToken('participant-token', {
      responses: [],
    });

    expect(questionRepository.find).not.toHaveBeenCalled();
    expect(responseRepository.create).not.toHaveBeenCalled();
    expect(responseRepository.save).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        submitted: true,
        response_count: 0,
        answered_response_count: 0,
        declined_response_count: 0,
        skipped_response_count: 1,
      }),
    );
    expect(submissionItemRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        original_question_id: 31,
        answer: null,
        response_state: SurveySubmissionItemState.SKIPPED,
      }),
    ]);
  });

  it('fige le questionnaire au premier affichage et le réutilise à la reprise', async () => {
    participant.questionnaire_snapshot = null;
    const hiddenSection = {
      id: 42,
      title: 'Section masquée',
      description: null,
      order_index: 5,
      is_visible: false,
      created_at: new Date('2025-01-03T00:00:00.000Z'),
    };
    participant.campaign.question_sections.push(hiddenSection);
    participant.campaign.questions.push({
      ...participant.campaign.questions[0],
      id: 32,
      question_text: 'Question masquée',
      section: hiddenSection,
    });

    const firstView = await service.getQuestionnaireByToken(
      'participant-token',
    );

    expect(firstView.sections.map((section) => section.id)).toEqual([41]);
    expect(firstView.questions.map((question) => question.id)).toEqual([31]);
    expect(participant.questionnaire_snapshot).toEqual(
      expect.objectContaining({
        version: 1,
        sections: [expect.objectContaining({ title: 'Section visible' })],
        questions: [
          expect.objectContaining({ question_text: 'Question originale' }),
        ],
      }),
    );

    participant.campaign.question_sections[0].title = 'Section modifiée';
    participant.campaign.questions[0].question_text = 'Question modifiée';
    participant.campaign.questions[0].choice_options = ['Nouvelle option'];

    const resumedView = await service.getQuestionnaireByToken(
      'participant-token',
    );

    expect(resumedView.sections[0].title).toBe('Section visible');
    expect(resumedView.questions[0]).toEqual(
      expect.objectContaining({
        question_text: 'Question originale',
        choice_options: ['1', '2', '3', '4', '5'],
      }),
    );
    expect(participantRepository.save).toHaveBeenCalledTimes(1);

    await service.submitByToken('participant-token', {
      responses: [{ question_id: 31, answer: '4' }],
    });

    expect(submissionItemRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({
        original_question_id: 31,
        question_text: 'Question originale',
        section_title: 'Section visible',
        choice_options: ['1', '2', '3', '4', '5'],
        answer: '4',
        response_state: SurveySubmissionItemState.ANSWERED,
      }),
    ]);
  });

  it('ne fabrique pas de snapshot pour une participation historique terminée', async () => {
    participant.questionnaire_snapshot = null;
    participant.completed_at = new Date('2024-01-01T00:00:00.000Z');
    participant.status = CampaignParticipantStatus.COMPLETED;

    await service.getQuestionnaireByToken('participant-token');

    expect(participant.questionnaire_snapshot).toBeNull();
    expect(participantRepository.save).not.toHaveBeenCalled();
  });

  it('préserve la soumission legacy sans inventer de lignes fiables', async () => {
    participant.questionnaire_snapshot = null;

    const result = await service.submitByToken('participant-token', {
      responses: [{ question_id: 31, answer: 'réponse legacy' }],
    });

    expect(result).toEqual(
      expect.objectContaining({
        submitted: true,
        response_count: 1,
        skipped_response_count: 0,
      }),
    );
    expect(responseRepository.save).toHaveBeenCalledTimes(1);
    expect(submissionItemRepository.create).not.toHaveBeenCalled();
    expect(submissionItemRepository.save).not.toHaveBeenCalled();
  });

  it('rejette une réponse answered vide avant toute écriture', async () => {
    await expect(
      service.submitByToken('participant-token', {
        responses: [
          {
            question_id: 31,
            answer: '   ',
            response_state: 'answered',
          },
        ],
      }),
    ).rejects.toThrow('must contain a value');

    expect(responseRepository.save).not.toHaveBeenCalled();
    expect(submissionItemRepository.save).not.toHaveBeenCalled();
    expect(participantRepository.save).not.toHaveBeenCalled();
  });

  const draftPayload = () => ({
    revision: 0,
    current_section: 1,
    started: true,
    responses: [
      {
        question_id: 31,
        answer: ' unfinished ',
        response_state: 'answered' as const,
      },
    ],
  });

  it('saves a draft separately without completing or publishing any responses', async () => {
    const result = await service.saveDraftByToken(
      'participant-token',
      draftPayload(),
    );
    expect(result).toMatchObject({
      saved: true,
      revision: 1,
      completed: false,
    });
    expect(participantRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CampaignParticipantStatus.IN_PROGRESS,
        completed_at: null,
        draft: expect.objectContaining({
          current_section: 1,
          responses: [
            {
              question_id: 31,
              answer: ' unfinished ',
              response_state: 'answered',
            },
          ],
        }),
      }),
    );
    expect(responseRepository.save).not.toHaveBeenCalled();
    expect(employeeRepository.save).not.toHaveBeenCalled();
    expect(participantRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        lock: { mode: 'pessimistic_write', tables: ['campaign_participants'] },
      }),
    );
  });

  it('returns the current draft on a stale revision without overwriting it', async () => {
    const participant =
      (await participantRepository.findOne()) as CampaignParticipant;
    participant.draft_revision = 5;
    participant.draft = { responses: [], current_section: 2, started: true };
    const result = await service.saveDraftByToken(
      'participant-token',
      draftPayload(),
    );
    expect(result).toMatchObject({
      saved: false,
      revision: 5,
      draft: participant.draft,
    });
    expect(participantRepository.save).not.toHaveBeenCalled();
  });

  it('rejects missing tokens, duplicate questions and foreign campaign questions', async () => {
    participantRepository.findOne.mockResolvedValueOnce(null);
    await expect(
      service.saveDraftByToken('missing', draftPayload()),
    ).rejects.toThrow('Participation link not found');
    const payload = draftPayload();
    await expect(
      service.saveDraftByToken('participant-token', {
        ...payload,
        responses: [...payload.responses, ...payload.responses],
      }),
    ).rejects.toThrow('Each question can only be answered once');
    await expect(
      service.saveDraftByToken('participant-token', {
        ...payload,
        responses: [{ ...payload.responses[0], question_id: 999 }],
      }),
    ).rejects.toThrow('must have been presented');
    expect(participantRepository.save).not.toHaveBeenCalled();
  });

  it('keeps an unfinished participation eligible for reminders with the same token', async () => {
    await service.saveDraftByToken('participant-token', draftPayload());
    const result = await service.getCampaignProgress(12);
    expect(result).toMatchObject({
      completed_participants: 0,
      in_progress_participants: 1,
      participation_rate: 0,
    });
    // Both reminder listing paths exclude only completed participants.
    const participant =
      (await participantRepository.findOne()) as CampaignParticipant;
    participant.employee.first_name = 'Test';
    participant.employee.email = 'test@example.com';
    campaignRepository.findOne = jest.fn().mockResolvedValue({
      id: 12,
      name: 'Survey',
      company: { name: 'Company' },
    });
    const reminders = await service.getPendingReminders(12);
    expect(reminders.participants).toHaveLength(1);
    expect(reminders.participants[0]).toMatchObject({ status: 'in_progress' });
    expect(reminders.participants[0].survey_url).toContain(
      '/survey-response/participant-token',
    );
  });

  it('final submission clears the draft and subsequent autosaves cannot reopen it', async () => {
    await service.saveDraftByToken('participant-token', draftPayload());
    await service.submitByToken('participant-token', {
      draft_revision: 1,
      responses: [{ question_id: 31, answer: 'final answer' }],
    });
    const participant =
      (await participantRepository.findOne()) as CampaignParticipant;
    expect(participant).toMatchObject({
      status: 'completed',
      draft: null,
      draft_revision: 2,
    });
    expect(responseRepository.save).toHaveBeenCalledWith([
      expect.objectContaining({ answer: 'final answer' }),
    ]);
    const result = await service.saveDraftByToken('participant-token', {
      ...draftPayload(),
      revision: 2,
    });
    expect(result).toMatchObject({
      saved: false,
      completed: true,
      draft: null,
    });
  });

  it('refuses final submission from a stale session before creating responses', async () => {
    await service.saveDraftByToken('participant-token', draftPayload());
    await expect(
      service.submitByToken('participant-token', {
        draft_revision: 0,
        responses: [{ question_id: 31, answer: 'stale' }],
      }),
    ).rejects.toThrow('another session');
    expect(responseRepository.save).not.toHaveBeenCalled();
  });
});
