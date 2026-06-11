import { SendGridMailService, SurveyInvitationEmailRecipient } from './sendgrid-mail.service';

describe('SendGridMailService', () => {
  const originalEnv = process.env;
  const recipient: SurveyInvitationEmailRecipient = {
    participant_id: 1,
    employee_id: 2,
    email: 'employee@example.com',
    name: 'Employee Test',
    first_name: 'Employee',
    survey_url: 'https://app.example.com/survey-response/token',
    campaign_name: 'Campagne test',
    company_name: 'Entreprise test',
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = {
      ...originalEnv,
      SENDGRID_API_KEY: 'SG.test',
      SENDGRID_FROM_EMAIL: 'sender@example.com',
      SENDGRID_FROM_NAME: 'RPS',
      SENDGRID_REPLY_TO: 'reply@example.com',
    };
    delete process.env.SENDGRID_INVITATION_TEMPLATE_ID;
    delete process.env.SENDGRID_REMINDER_TEMPLATE_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('classifies SendGrid 429 responses as rate limited failures', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: 'too many requests', field: null }],
        }),
        {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'x-ratelimit-limit': '150',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '1780582264',
          },
        },
      ),
    );

    const result = await new SendGridMailService().sendSurveyInvitations([
      recipient,
    ]);

    expect(result.sent).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toMatchObject({
      status_code: 429,
      reason: 'rate_limited',
      rate_limit: {
        limit: 150,
        remaining: 0,
        reset: 1780582264,
      },
    });
    expect(result.failed[0].error).toContain('Limite SendGrid atteinte');
  });

  it('classifies SendGrid credit errors as quota failures', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ message: 'Your SendGrid credits are exhausted' }],
        }),
        {
          status: 403,
          statusText: 'Forbidden',
        },
      ),
    );

    const result = await new SendGridMailService().sendSurveyReminders([
      recipient,
    ]);

    expect(result.sent).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]).toMatchObject({
      status_code: 403,
      reason: 'quota_exceeded',
    });
    expect(result.failed[0].error).toContain('Quota ou credits SendGrid epuises');
  });

  it('uses the configured default dynamic templates for invitations and reminders', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }));

    await new SendGridMailService().sendSurveyInvitations([recipient]);
    await new SendGridMailService().sendSurveyReminders([recipient]);

    const invitationBody = getFetchBody(fetchMock, 0);
    const reminderBody = getFetchBody(fetchMock, 1);

    expect(invitationBody.template_id).toBe(
      'd-29ae7d6438ff4c24b8b179a840fd15a4',
    );
    expect(reminderBody.template_id).toBe(
      'd-83afb17df29c43c89489a20ee92d500b',
    );
  });

  it('normalizes a SendGrid template id without d-prefix', async () => {
    process.env.SENDGRID_INVITATION_TEMPLATE_ID =
      '29ae7d6438ff4c24b8b179a840fd15a4';
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }));

    await new SendGridMailService().sendSurveyInvitations([recipient]);

    expect(getFetchBody(fetchMock, 0).template_id).toBe(
      'd-29ae7d6438ff4c24b8b179a840fd15a4',
    );
  });

  it('falls back to the inline email when a dynamic template fails', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            errors: [{ message: 'template not found', field: 'template_id' }],
          }),
          { status: 400, statusText: 'Bad Request' },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 202 }));

    const result = await new SendGridMailService().sendSurveyInvitations([
      recipient,
    ]);

    expect(result.sent).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const templateBody = getFetchBody(fetchMock, 0);
    const fallbackBody = getFetchBody(fetchMock, 1);

    expect(templateBody.template_id).toBe(
      'd-29ae7d6438ff4c24b8b179a840fd15a4',
    );
    expect(fallbackBody.template_id).toBeUndefined();
    expect(fallbackBody.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text/plain' }),
        expect.objectContaining({ type: 'text/html' }),
      ]),
    );
  });
});

function getFetchBody(
  fetchMock: jest.SpiedFunction<typeof fetch>,
  callIndex: number,
) {
  const init = fetchMock.mock.calls[callIndex][1] as RequestInit;

  return JSON.parse(String(init.body)) as Record<string, any>;
}
