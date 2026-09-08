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
  let employeeRepository: { save: jest.Mock };
  let campaignRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    const participant = {
      id: 7,
      participation_token: 'participant-token',
      completed_at: null,
      status: CampaignParticipantStatus.PENDING,
      campaign: { id: 12 },
      employee: { id: 21, status: 'PENDING', deleted_at: null },
    };
    const question = { id: 31, campaign: { id: 12 } };

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
    employeeRepository = {
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    campaignRepository = { findOne: jest.fn() };

    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === CampaignParticipant) return participantRepository;
        if (entity === Question) return questionRepository;
        if (entity === SurveyResponse) return responseRepository;
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
      }),
    );
    expect(participantRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: CampaignParticipantStatus.COMPLETED,
        completed_at: expect.any(Date),
      }),
    );
  });

  it('distingue une réponse, un refus et une question vide', async () => {
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
      }),
    );
  });

  it('finalise une soumission entièrement vide sans créer de réponse', async () => {
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
      }),
    );
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
    questionRepository.find.mockResolvedValueOnce([]);
    await expect(
      service.saveDraftByToken('participant-token', payload),
    ).rejects.toThrow('must belong');
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
