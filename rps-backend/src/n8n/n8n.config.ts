const DEFAULT_N8N_BASE_URL = 'https://automation.laroche360.ca/n8n';
const DEFAULT_N8N_WEBHOOK_PATH = '/webhook/rps-analysis';
const WEBHOOK_SUFFIX_PATTERN = /\/webhook(?:-test|-waiting)?\/.+$/i;
const PUBLIC_N8N_HOST = 'automation.laroche360.ca';
const PUBLIC_N8N_SUBPATH = '/n8n';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function ensureLeadingSlash(value: string) {
  return value.startsWith('/') ? value : `/${value}`;
}

function getConfiguredN8nUrl() {
  const configuredUrl =
    process.env.N8N_WEBHOOK_URL?.trim() ||
    process.env.N8N_BASE_URL?.trim() ||
    DEFAULT_N8N_BASE_URL;

  return normalizePublicN8nUrl(configuredUrl);
}

function normalizePublicN8nUrl(value: string) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    return value;
  }

  if (parsedUrl.hostname !== PUBLIC_N8N_HOST) {
    return value;
  }

  const pathname = parsedUrl.pathname || '/';
  if (pathname.startsWith(`${PUBLIC_N8N_SUBPATH}/`) || pathname === PUBLIC_N8N_SUBPATH) {
    return trimTrailingSlash(parsedUrl.toString());
  }

  const normalizedPath =
    pathname === '/' ? PUBLIC_N8N_SUBPATH : `${PUBLIC_N8N_SUBPATH}${pathname}`;
  parsedUrl.pathname = normalizedPath;

  return trimTrailingSlash(parsedUrl.toString());
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
