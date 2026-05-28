/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Company } from '../company/company.entity';
import { SurveyResponse } from '../response/response.entity';
import { Campaign } from './campaign.entity';
import { CampaignService } from './campaign.service';

describe('CampaignService', () => {
  let service: CampaignService;
  let campaignRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };
  let responseRepository: { find: jest.Mock };
  const originalN8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    process.env.N8N_WEBHOOK_URL = 'http://n8n.test/webhook/rps';
    campaignRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    responseRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        {
          provide: getRepositoryToken(Campaign),
          useValue: campaignRepository,
        },
        {
          provide: getRepositoryToken(Company),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SurveyResponse),
          useValue: responseRepository,
        },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  afterEach(() => {
    if (originalN8nWebhookUrl === undefined) {
      delete process.env.N8N_WEBHOOK_URL;
    } else {
      process.env.N8N_WEBHOOK_URL = originalN8nWebhookUrl;
    }
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('formats only responses from the requested campaign', async () => {
    responseRepository.find.mockResolvedValue([
      {
        answer: '4',
        employee: {
          id: 7,
          company_name: null,
          email: 'test@example.com',
          first_name: 'Ada',
          last_name: 'Lovelace',
          department: 'R&D',
        },
        question: {
          order_index: 1,
        },
      },
    ]);

    const rows = await (service as any).getCampaignResponsesFormatted(
      12,
      'Entreprise Test',
    );

    expect(responseRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employee: {
            campaign_participations: {
              campaign: { id: 12 },
            },
          },
          question: {
            campaign: { id: 12 },
          },
          deleted_at: expect.any(Object),
        }),
      }),
    );
    expect(rows).toEqual([
      {
        Employeur: 'Entreprise Test',
        Email: 'test@example.com',
        'Nom et Prenom': 'Ada Lovelace',
        Fonction: 'R&D',
        Statut: 'OK',
        Q1: '4',
      },
    ]);
  });

  it('rejects analysis before calling n8n when a campaign has no usable responses', async () => {
    jest
      .spyOn(service as any, 'getCampaignResponsesFormatted')
      .mockResolvedValue([]);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      (service as any).triggerAnalysis(
        4,
        'Campagne vide',
        'Entreprise Test',
        'client@example.com',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects campaign analysis until the campaign end date has passed', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    campaignRepository.findOne.mockResolvedValue({
      id: 4,
      name: 'Campagne active',
      end_date: tomorrow,
      company: { id: 1, name: 'Entreprise Test' },
      questions: [],
      reports: [],
    });
    const triggerSpy = jest.spyOn(service as any, 'triggerAnalysis');

    await expect(service.analyze(4, 'client@example.com')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(triggerSpy).not.toHaveBeenCalled();
    expect(responseRepository.find).not.toHaveBeenCalled();
  });

  it('allows campaign analysis after the campaign end date has passed', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    campaignRepository.findOne.mockResolvedValue({
      id: 4,
      name: 'Campagne terminee',
      end_date: yesterday,
      company: { id: 1, name: 'Entreprise Test' },
      questions: [],
      reports: [],
    });
    const result = {
      success: true,
      message: 'ok',
    };
    const triggerSpy = jest
      .spyOn(service as any, 'triggerAnalysis')
      .mockResolvedValue(result);

    await expect(service.analyze(4, 'client@example.com')).resolves.toEqual(
      result,
    );

    expect(triggerSpy).toHaveBeenCalledWith(
      4,
      'Campagne terminee',
      'Entreprise Test',
      'client@example.com',
    );
  });

  it('posts the expected local analysis payload to n8n', async () => {
    jest
      .spyOn(service as any, 'getCampaignResponsesFormatted')
      .mockResolvedValue([
        {
          Employeur: 'Entreprise Test',
          Email: 'employee@example.com',
          'Nom et Prenom': 'Ada Lovelace',
          Fonction: 'R&D',
          Statut: 'OK',
          Q1: '4',
        },
      ]);
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await (service as any).triggerAnalysis(
      1,
      'Campagne active',
      'Entreprise Test',
      'client@example.com',
    );

    expect(result).toEqual({
      success: true,
      message:
        'Analyse lancee. Le rapport sera disponible dans Google Drive dans quelques minutes.',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://n8n.test/webhook/rps',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual({
      body: {
        body: [
          {
            Employeur: 'Entreprise Test',
            Email: 'employee@example.com',
            'Nom et Prenom': 'Ada Lovelace',
            Fonction: 'R&D',
            Statut: 'OK',
            Q1: '4',
          },
        ],
        campaign_id: 1,
        client_email: 'client@example.com',
      },
      campaign_name: 'Campagne active',
      company_name: 'Entreprise Test',
      user_email: 'client@example.com',
    });
  });

  it('wraps n8n failures in a delivery error', async () => {
    jest
      .spyOn(service as any, 'getCampaignResponsesFormatted')
      .mockResolvedValue([{ Employeur: 'Entreprise Test', Q1: '4' }]);
    jest.spyOn((service as any).logger, 'error').mockImplementation();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Error',
    }) as unknown as typeof fetch;

    await expect(
      (service as any).triggerAnalysis(
        1,
        'Campagne active',
        'Entreprise Test',
        'client@example.com',
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

});
