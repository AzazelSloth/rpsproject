import { getN8nBaseUrl, getN8nWebhookUrl } from './n8n.config';

describe('getN8nWebhookUrl', () => {
  const originalEnv = {
    N8N_BASE_URL: process.env.N8N_BASE_URL,
    N8N_WEBHOOK_PATH: process.env.N8N_WEBHOOK_PATH,
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  };

  afterEach(() => {
    restoreEnvValue('N8N_BASE_URL', originalEnv.N8N_BASE_URL);
    restoreEnvValue('N8N_WEBHOOK_PATH', originalEnv.N8N_WEBHOOK_PATH);
    restoreEnvValue('N8N_WEBHOOK_URL', originalEnv.N8N_WEBHOOK_URL);
  });

  it('keeps a fully configured webhook URL unchanged', () => {
    process.env.N8N_WEBHOOK_URL =
      'http://localhost:5678/webhook/rps-analysis';
    delete process.env.N8N_BASE_URL;
    delete process.env.N8N_WEBHOOK_PATH;

    expect(getN8nWebhookUrl()).toBe(
      'http://localhost:5678/webhook/rps-analysis',
    );
    expect(getN8nBaseUrl()).toBe('http://localhost:5678');
  });

  it('builds the webhook URL from a local base URL and path', () => {
    process.env.N8N_WEBHOOK_URL = 'http://localhost:5678';
    process.env.N8N_WEBHOOK_PATH = '/webhook/rps-analysis';
    delete process.env.N8N_BASE_URL;

    expect(getN8nWebhookUrl()).toBe(
      'http://localhost:5678/webhook/rps-analysis',
    );
    expect(getN8nBaseUrl()).toBe('http://localhost:5678');
  });

  it('uses the default public n8n subdomain when no environment value is set', () => {
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_BASE_URL;
    delete process.env.N8N_WEBHOOK_PATH;

    expect(getN8nWebhookUrl()).toBe(
      'https://automation.laroche360.ca/webhook/rps-analysis',
    );
    expect(getN8nBaseUrl()).toBe('https://automation.laroche360.ca');
  });

  it('keeps the public n8n subdomain when base URL has trailing slash', () => {
    process.env.N8N_BASE_URL = 'https://automation.laroche360.ca/';
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_PATH;

    expect(getN8nBaseUrl()).toBe('https://automation.laroche360.ca');
    expect(getN8nWebhookUrl()).toBe(
      'https://automation.laroche360.ca/webhook/rps-analysis',
    );
  });

  it('normalizes missing leading slash in webhook path', () => {
    process.env.N8N_WEBHOOK_URL = 'http://localhost:5678';
    process.env.N8N_WEBHOOK_PATH = 'webhook/rps-analysis';
    delete process.env.N8N_BASE_URL;

    expect(getN8nWebhookUrl()).toBe(
      'http://localhost:5678/webhook/rps-analysis',
    );
  });

  it('keeps a public webhook URL on the n8n subdomain unchanged', () => {
    process.env.N8N_WEBHOOK_URL =
      'https://automation.laroche360.ca/webhook/rps-analysis';
    delete process.env.N8N_BASE_URL;
    delete process.env.N8N_WEBHOOK_PATH;

    expect(getN8nWebhookUrl()).toBe(
      'https://automation.laroche360.ca/webhook/rps-analysis',
    );
    expect(getN8nBaseUrl()).toBe('https://automation.laroche360.ca');
  });

  it('builds a public webhook URL from the n8n subdomain', () => {
    process.env.N8N_BASE_URL = 'https://automation.laroche360.ca';
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_WEBHOOK_PATH;

    expect(getN8nBaseUrl()).toBe('https://automation.laroche360.ca');
    expect(getN8nWebhookUrl()).toBe(
      'https://automation.laroche360.ca/webhook/rps-analysis',
    );
  });
});

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
