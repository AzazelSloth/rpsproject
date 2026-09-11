import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/auth.guard';
import { isSurveyTimingAllowedEmail } from '../auth/admin-access.config';
import { CampaignParticipant } from './campaign-participant.entity';
import { CampaignParticipantController } from './campaign-participant.controller';
import { CampaignParticipantService } from './campaign-participant.service';
import { SaveSurveyTimingDto } from './dto/campaign-participant.dto';
import { applyParticipationTiming } from './participation-timing';

function participant() {
  return Object.assign(new CampaignParticipant(), {
    created_at: new Date(1000),
    completed_at: null,
    timing_started_at: null,
    timing_intervals: [],
  });
}

describe('Participation timing', () => {
  it('unions retries and overlapping tabs without counting pauses twice', () => {
    const entry = participant();
    const payload = {
      started_at: 2000,
      intervals: [{ start: 2000, end: 7000 }],
    };
    applyParticipationTiming(entry, payload, 20000);
    applyParticipationTiming(entry, payload, 20000);
    applyParticipationTiming(
      entry,
      {
        started_at: 6000,
        intervals: [
          { start: 6000, end: 9000 },
          { start: 12000, end: 15000 },
        ],
      },
      20000,
    );
    expect(entry.timing_started_at).toEqual(new Date(2000));
    expect(entry.timing_intervals).toEqual([
      { start: 2000, end: 9000 },
      { start: 12000, end: 15000 },
    ]);
  });

  it('accepts late offline intervals only up to final validation', () => {
    const entry = participant();
    entry.completed_at = new Date(10000);
    applyParticipationTiming(
      entry,
      {
        started_at: 2000,
        intervals: [
          { start: 2000, end: 12000 },
          { start: 14000, end: 18000 },
        ],
      },
      20000,
    );
    expect(entry.timing_intervals).toEqual([{ start: 2000, end: 10000 }]);
  });

  it('clips clock skew without blocking final submission', () => {
    const entry = participant();
    applyParticipationTiming(
      entry,
      { started_at: 30000, intervals: [{ start: 30000, end: 35000 }] },
      20000,
    );
    expect(entry.timing_started_at).toEqual(new Date(20000));
    expect(entry.timing_intervals).toEqual([]);
  });

  it('rejects inverted intervals', () => {
    expect(() =>
      applyParticipationTiming(participant(), {
        started_at: 1000,
        intervals: [{ start: 4000, end: 3000 }],
      }),
    ).toThrow('Invalid timing interval');
  });

  it('does not expose timing or completion timestamps through ordinary entity serialization', () => {
    const entry = participant();
    entry.completed_at = new Date(10000);
    applyParticipationTiming(entry, { started_at: 2000, intervals: [] }, 20000);
    const serialized = instanceToPlain({ participants: [entry] }) as {
      participants: Record<string, unknown>[];
    };
    for (const key of [
      'completed_at',
      'timing_started_at',
      'timing_intervals',
    ]) {
      expect(serialized.participants[0]).not.toHaveProperty(key);
    }
  });

  it('validates timing payloads at the API boundary', async () => {
    const invalid = plainToInstance(SaveSurveyTimingDto, {
      started_at: 'invalid',
      intervals: [{ start: -1, end: 1.5 }],
    });
    expect((await validate(invalid)).length).toBeGreaterThan(0);
    expect(
      await validate(
        plainToInstance(SaveSurveyTimingDto, {
          started_at: 1000,
          intervals: [],
        }),
      ),
    ).toEqual([]);
  });
});

describe('Timing access', () => {
  const previousTestSurveyEmails =
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;
  beforeEach(() => {
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS =
      'toky.rao@gmail.com,genevieve.majorbr@gmail.com,cathynomeniavo@gmail.com';
  });
  afterEach(() => {
    if (previousTestSurveyEmails === undefined)
      delete process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;
    else
      process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS = previousTestSurveyEmails;
  });

  it.each([
    'cathynomeniavo@gmail.com',
    'toky.rao@gmail.com',
    'genevieve.majorbr@gmail.com',
  ])('permits %s', (email) => {
    expect(isSurveyTimingAllowedEmail(` ${email.toUpperCase()} `)).toBe(true);
  });

  it.each([
    'isabelle@laroche360.ca',
    'roxanne@laroche360.ca',
    'n8n@internal',
    'other@gmail.com',
  ])('denies %s on the backend', (email) => {
    const service = { getCampaignTiming: jest.fn() };
    const controller = new CampaignParticipantController(
      service as unknown as CampaignParticipantService,
    );
    expect(() =>
      controller.getCampaignTiming(1, {
        user: { email },
      } as AuthenticatedRequest),
    ).toThrow(ForbiddenException);
    expect(service.getCampaignTiming).not.toHaveBeenCalled();
  });

  it('uses exact addresses from the shared variable and denies wildcard matching', () => {
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS = 'toky.rao@gmail.com,*@gmail.com';
    expect(isSurveyTimingAllowedEmail('toky.rao@gmail.com')).toBe(true);
    expect(isSurveyTimingAllowedEmail('cathynomeniavo@gmail.com')).toBe(false);
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS = '';
    expect(isSurveyTimingAllowedEmail('toky.rao@gmail.com')).toBe(false);
  });

  it('uses the shared server-side account list', () => {
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS =
      'toky.rao@gmail.com,genevieve.majorbr@gmail.com,cathynomeniavo@gmail.com';

    expect(isSurveyTimingAllowedEmail('genevieve.majorbr@gmail.com')).toBe(true);
    expect(isSurveyTimingAllowedEmail('other@gmail.com')).toBe(false);
  });
});
