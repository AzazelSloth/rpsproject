const DEFAULT_N8N_BASE_URL = 'https://automation.laroche360.ca/n8n';
const DEFAULT_N8N_WEBHOOK_PATH = '/webhook/rps-analysis';
const WEBHOOK_SUFFIX_PATTERN = /\/webhook(?:-test|-waiting)?\/.+$/i;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function ensureLeadingSlash(value: string) {
  return value.startsWith('/') ? value : `/${value}`;
}

function getConfiguredN8nUrl() {
  return (
    process.env.N8N_WEBHOOK_URL?.trim() ||
    process.env.N8N_BASE_URL?.trim() ||
    DEFAULT_N8N_BASE_URL
  );
}

export function getN8nBaseUrl() {
  const configuredUrl = trimTrailingSlash(getConfiguredN8nUrl());
  return trimTrailingSlash(configuredUrl.replace(WEBHOOK_SUFFIX_PATTERN, ''));
}

export function getN8nWebhookUrl() {
  const configuredUrl = trimTrailingSlash(getConfiguredN8nUrl());

  if (WEBHOOK_SUFFIX_PATTERN.test(configuredUrl)) {
    return configuredUrl;
  }

  const baseUrl = getN8nBaseUrl();
  const webhookPath =
    process.env.N8N_WEBHOOK_PATH?.trim() || DEFAULT_N8N_WEBHOOK_PATH;
  return `${baseUrl}${ensureLeadingSlash(webhookPath)}`;
}
