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
    delete process.env.SENDGRID_FINAL_REMINDER_TEMPLATE_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('passes saved champion data to both dynamic templates without changing recipients or reply-to', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));
    const contact = { ...recipient, champion_name: 'Contact réel', champion_email: 'champion@example.com' };
    const service = new SendGridMailService();
    await service.sendSurveyInvitations([contact]);
    await service.sendSurveyReminders([contact]);
    for (const index of [0, 1]) {
      const body = getFetchBody(fetchMock, index);
      expect(body.personalizations[0].dynamic_template_data).toMatchObject({
        championName: 'Contact réel', champion_name: 'Contact réel', nomChampion: 'Contact réel',
        championEmail: 'champion@example.com', champion_email: 'champion@example.com', emailChampion: 'champion@example.com',
        hasChampion: true, companyName: recipient.company_name, surveyLink: recipient.survey_url,
      });
      expect(body.personalizations[0].to).toEqual([{ email: recipient.email, name: recipient.name }]);
      expect(body.reply_to.email).toBe('reply@example.com');
    }
  });

  it.each([
    { champion_name: null, champion_email: null, hasChampion: false },
    { champion_name: 'Contact seul', champion_email: null, hasChampion: true },
    { champion_name: null, champion_email: 'champion@example.com', hasChampion: true },
  ])('does not invent missing champion fields: %j', async (contact) => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));
    await new SendGridMailService().sendSurveyInvitations([{ ...recipient, ...contact }]);
    expect(getFetchBody(fetchMock, 0).personalizations[0].dynamic_template_data).toMatchObject({
      championName: contact.champion_name ?? '', championEmail: contact.champion_email ?? '', hasChampion: contact.hasChampion,
    });
  });

  it.each(['invitation', 'reminder'])('includes an escaped champion in %s fallback without sending extra mail', async (kind) => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ errors: [{ message: 'template not found' }] }), { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const service = new SendGridMailService();
    const contact = { ...recipient, champion_name: '<b>Contact</b>', champion_email: 'champion@example.com' };
    if (kind === 'invitation') await service.sendSurveyInvitations([contact]);
    else await service.sendSurveyReminders([contact]);
    const content = getFetchBody(fetchMock, 1).content as Array<{ type: string; value: string }>;
    const html = content.find((part) => part.type === 'text/html')!.value;
    expect(html).toContain('&lt;b&gt;Contact&lt;/b&gt;');
    expect(html).not.toContain('<b>Contact</b>');
    expect(html).toContain('champion@example.com');
    expect(content.find((part) => part.type === 'text/plain')!.value).toContain('<b>Contact</b>, champion@example.com');
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  it('supplies the active Email 3 template variables and preserves legacy aliases', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }));

    await new SendGridMailService().sendSurveyFinalReminders([
      {
        ...recipient,
        champion_name: 'Marie Champion',
        champion_email: 'marie@example.com',
        end_date: '2026-09-30',
      },
    ]);

    const body = getFetchBody(fetchMock, 0);
    expect(body.template_id).toBe('d-039191451ef9494097dcee955088d1ac');
    expect(body.personalizations[0].dynamic_template_data).toMatchObject({
      firstName: 'Employee',
      endDate: '30 septembre 2026',
      surveyLink: recipient.survey_url,
      championName: 'Marie Champion',
      championEmail: 'marie@example.com',
      companyName: recipient.company_name,
      emailType: 'final_reminder',
      isReminder: true,
      firstname: 'Employee',
      champion: 'Marie Champion',
      emailchampion: 'marie@example.com',
    });
  });

  it('formats survey dates in full French words', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 202 }));

    await new SendGridMailService().sendSurveyInvitations([
      {
        ...recipient,
        start_date: '2026-09-02',
        end_date: '2026-09-30',
      },
    ]);

    const invitationBody = getFetchBody(fetchMock, 0);
    expect(
      invitationBody.personalizations[0].dynamic_template_data,
    ).toMatchObject({
      startDate: '2 septembre 2026',
      endDate: '30 septembre 2026',
    });
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

  if (typeof init.body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(init.body) as {
    template_id?: string;
    personalizations: Array<{
      to: Array<{ email: string; name: string }>;
      dynamic_template_data: Record<string, unknown>;
    }>;
    reply_to: { email: string };
    content: Array<{ type: string; value: string }>;
  };
}
