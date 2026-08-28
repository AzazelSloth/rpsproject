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
    save: jest.Mock;
  };
  let questionRepository: { find: jest.Mock };
  let responseRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let employeeRepository: { save: jest.Mock };

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
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    questionRepository = {
      find: jest.fn().mockResolvedValue([question]),
    };
    responseRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((value) => value),
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    employeeRepository = {
      save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };

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
      transaction: jest.fn((callback) => callback(manager)),
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
          useValue: {},
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
});
