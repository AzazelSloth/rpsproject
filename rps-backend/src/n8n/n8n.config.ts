const DEFAULT_N8N_BASE_URL = 'http://127.0.0.1:5678/n8n';
const DEFAULT_N8N_WEBHOOK_PATH = '/webhook/sondage-rps-solutions-tech';
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

export function getN8nWebhookUrl() {
  const configuredUrl = trimTrailingSlash(getConfiguredN8nUrl());

  if (WEBHOOK_SUFFIX_PATTERN.test(configuredUrl)) {
    return configuredUrl;
  }

  const webhookPath = process.env.N8N_WEBHOOK_PATH?.trim() || DEFAULT_N8N_WEBHOOK_PATH;
  return `${configuredUrl}${ensureLeadingSlash(webhookPath)}`;
}
