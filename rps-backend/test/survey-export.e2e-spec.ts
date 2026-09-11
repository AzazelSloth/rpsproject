import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthGuard } from '../src/auth/auth.guard';
import { AuthService } from '../src/auth/auth.service';
import { SurveyExportGuard } from '../src/auth/survey-export.guard';
import { User } from '../src/auth/user.entity';
import { CampaignParticipant } from '../src/campaign-participant/campaign-participant.entity';
import { SurveySubmissionItem } from '../src/campaign-participant/survey-submission-item.entity';
import { Campaign } from '../src/campaign/campaign.entity';
import { SurveyResponse } from '../src/response/response.entity';
import { SurveyExportController } from '../src/survey-export/survey-export.controller';
import { SurveyExportService } from '../src/survey-export/survey-export.service';

const EXPORT_ADMIN = { id: 11, email: 'export-admin@example.test' };
const OTHER_ADMIN = { id: 12, email: 'other-admin@example.test' };
const TEST_PSEUDONYM_SECRET = 'http-export-test-only-pseudonym-secret';
const TEST_API_KEY = 'http-export-test-only-api-key';
const ENVIRONMENT_KEYS = [
  'ADMIN_ALLOWED_EMAILS',
  'SURVEY_EXPORT_ALLOWED_EMAILS',
  'SURVEY_EXPORT_PSEUDONYM_SECRET',
  'API_KEY',
] as const;

type ParticipantQuery = { where: { campaign?: { id: number } } };
type ItemQuery = {
  where: {
    participation?: {
      id?: { value: number[] };
      campaign?: { id: number };
    };
  };
};

describe('Survey exports over HTTP (e2e)', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  const originalEnvironment = Object.fromEntries(
    ENVIRONMENT_KEYS.map((key) => [key, process.env[key]]),
  );
  const participants = [5, 6].map((campaignId) => ({
    id: campaignId * 1000 + 1,
    campaign: { id: campaignId },
    completed_at: new Date('2026-09-01T10:00:00Z'),
    questionnaire_snapshot: { version: 1 },
    employee: { id: campaignId * 1000 + 2, email: 'private@example.test' },
  }));
  const items = participants.flatMap((participation) =>
    ['choice', 'text'].map((questionType, index) => ({
      participation,
      original_question_id: participation.id + index,
      question_text: `Campaign ${participation.campaign.id} ${questionType}`,
      question_type: questionType,
      section_title: 'Section',
      section_order: 0,
      question_order: index,
      choice_options: questionType === 'choice' ? ['Oui', 'Non'] : null,
      answer: questionType === 'choice' ? 'Oui' : '=1+1; commentaire privé',
      response_state: 'answered',
    })),
  );
  const participantRepository = {
    find: jest.fn((query: ParticipantQuery) =>
      Promise.resolve(
        participants.filter(
          (participant) =>
            !query.where.campaign ||
            participant.campaign.id === query.where.campaign.id,
        ),
      ),
    ),
  };
  const itemRepository = {
    find: jest.fn((query: ItemQuery) => {
      const scope = query.where.participation;
      return Promise.resolve(
        items.filter(
          (item) =>
            (!scope?.campaign ||
              item.participation.campaign.id === scope.campaign.id) &&
            (!scope?.id || scope.id.value.includes(item.participation.id)),
        ),
      );
    }),
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'http-export-test-only-jwt-key' }),
      ],
      controllers: [SurveyExportController],
      providers: [
        AuthGuard,
        AuthService,
        SurveyExportGuard,
        SurveyExportService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: ({ where }: { where: { id: number } }) =>
              Promise.resolve(
                [EXPORT_ADMIN, OTHER_ADMIN].find(
                  (user) => user.id === where.id,
                ),
              ),
          },
        },
        {
          provide: getRepositoryToken(Campaign),
          useValue: {
            findOne: ({ where }: { where: { id: number } }) =>
              Promise.resolve(
                [5, 6].includes(where.id) ? { id: where.id } : null,
              ),
          },
        },
        {
          provide: getRepositoryToken(CampaignParticipant),
          useValue: participantRepository,
        },
        {
          provide: getRepositoryToken(SurveySubmissionItem),
          useValue: itemRepository,
        },
        {
          provide: getRepositoryToken(SurveyResponse),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    jwt = moduleFixture.get(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_ALLOWED_EMAILS = [
      EXPORT_ADMIN.email,
      OTHER_ADMIN.email,
    ].join(',');
    process.env.SURVEY_EXPORT_ALLOWED_EMAILS = EXPORT_ADMIN.email;
    process.env.SURVEY_EXPORT_PSEUDONYM_SECRET = TEST_PSEUDONYM_SECRET;
    process.env.API_KEY = TEST_API_KEY;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    for (const key of ENVIRONMENT_KEYS) {
      const original = originalEnvironment[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });

  function tokenFor(user: { id: number; email: string }) {
    return jwt.sign({
      sub: user.id,
      email: user.email,
      permissions: ['EXPORT_SURVEY_RESPONSES'],
    });
  }

  it.each(['closed', 'text'] as const)(
    'downloads the authorized %s CSV with private headers and campaign isolation',
    async (kind) => {
      const response = await request(app.getHttpServer())
        .get(`/api/survey-exports/campaign/5/${kind}`)
        .set('Authorization', `Bearer ${tokenFor(EXPORT_ADMIN)}`)
        .expect(200)
        .expect('Content-Type', /text\/csv; charset=utf-8/)
        .expect(
          'Content-Disposition',
          new RegExp(`attachment; filename="survey-5-${kind}-.*\\.csv"`),
        )
        .expect('Cache-Control', 'private, no-store, max-age=0')
        .expect('Pragma', 'no-cache')
        .expect('X-Content-Type-Options', 'nosniff');

      expect(response.text).toContain('"Répondant";"Section";"Question"');
      expect(response.text).toMatch(/R-[A-F0-9]{16}/);
      expect(response.text).toContain(
        `Campaign 5 ${kind === 'closed' ? 'choice' : 'text'}`,
      );
      expect(response.text).not.toContain(
        `Campaign 5 ${kind === 'closed' ? 'text' : 'choice'}`,
      );
      expect(response.text).not.toContain('Campaign 6');
      expect(response.text).not.toContain('private@example.test');
      expect(response.text).not.toContain(TEST_PSEUDONYM_SECRET);
      if (kind === 'text') {
        expect(response.text).toContain("'=1+1; commentaire privé");
      }
    },
  );

  it('rejects unauthenticated requests before reading responses', async () => {
    await request(app.getHttpServer())
      .get('/api/survey-exports/campaign/5/closed')
      .expect(401);
    expect(participantRepository.find).not.toHaveBeenCalled();
  });

  it('rejects an unlisted administrator despite a claimed export permission', async () => {
    await request(app.getHttpServer())
      .get('/api/survey-exports/campaign/5/text')
      .set('Authorization', `Bearer ${tokenFor(OTHER_ADMIN)}`)
      .expect(403);
    expect(participantRepository.find).not.toHaveBeenCalled();
  });

  it('rejects the existing n8n API key before reading responses', async () => {
    await request(app.getHttpServer())
      .get('/api/survey-exports/campaign/5/closed')
      .set('x-api-key', TEST_API_KEY)
      .expect(403);
    expect(participantRepository.find).not.toHaveBeenCalled();
  });

  it('returns 503 rather than exporting without the pseudonym secret', async () => {
    delete process.env.SURVEY_EXPORT_PSEUDONYM_SECRET;

    await request(app.getHttpServer())
      .get('/api/survey-exports/campaign/5/closed')
      .set('Authorization', `Bearer ${tokenFor(EXPORT_ADMIN)}`)
      .expect(503);
    expect(participantRepository.find).not.toHaveBeenCalled();
    expect(itemRepository.find).not.toHaveBeenCalled();
  });
});
