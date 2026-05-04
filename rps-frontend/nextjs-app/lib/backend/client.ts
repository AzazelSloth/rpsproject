import { ApiResponseError, apiFetch, getApiBaseUrl } from "@/lib/api";
import { mockAPI } from "./mock-api";

const DEMO_AUTH_TOKEN = "auth-disabled";
const BACKEND_MODE_REAL = "real";
const BACKEND_MODE_MOCK = "mock";

type BackendMode = typeof BACKEND_MODE_REAL | typeof BACKEND_MODE_MOCK;

export class BackendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendConfigurationError";
  }
}

function resolveBackendUrl(): string | null {
  return getApiBaseUrl();
}

function readBackendMode(): BackendMode | null {
  const configuredMode = process.env.NEXT_PUBLIC_BACKEND_MODE?.trim().toLowerCase();

  if (configuredMode === BACKEND_MODE_REAL || configuredMode === BACKEND_MODE_MOCK) {
    return configuredMode;
  }

  return null;
}

function getBackendMode(): BackendMode {
  const mode = readBackendMode();

  if (!mode) {
    throw new BackendConfigurationError(
      "Backend mode is not configured. Set NEXT_PUBLIC_BACKEND_MODE to 'real' or 'mock'."
    );
  }

  return mode;
}

function getRequiredBackendUrl() {
  const backendUrl = resolveBackendUrl();

  if (!backendUrl) {
    throw new BackendConfigurationError(
      "Backend API URL is not configured. Set NEXT_PUBLIC_API_URL for browser requests and API_URL for server-side requests."
    );
  }

  return backendUrl;
}

export function isMockBackendEnabled() {
  return readBackendMode() === BACKEND_MODE_MOCK;
}

export function isBackendConfigured() {
  return readBackendMode() === BACKEND_MODE_REAL && Boolean(resolveBackendUrl());
}

function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = customToken || null;

  return token && token !== DEMO_AUTH_TOKEN ? { Authorization: `Bearer ${token}` } : {};
}

function mergeHeaders(initHeaders?: HeadersInit, customToken?: string) {
  const headers = new Headers(initHeaders);
  headers.set("Content-Type", "application/json");

  for (const [key, value] of Object.entries(getAuthHeaders(customToken))) {
    headers.set(key, value);
  }

  return headers;
}

function logBackendWarning(message: string) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[Backend] ${message}`);
  }
}

async function backendFetch<T>(path: string, init?: RequestInit) {
  const backendMode = getBackendMode();

  if (backendMode === BACKEND_MODE_MOCK) {
    return handleMockRequest<T>(path, init);
  }

  const backendUrl = getRequiredBackendUrl();
  const controller = new AbortController();
  const timeoutMs = path.includes("/import-employees") ? 120000 : 30000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await apiFetch<T>(path, {
      ...init,
      signal: controller.signal,
      headers: mergeHeaders(init?.headers),
      cache: "no-store",
    });
  } catch (error) {
    clearTimeout(timeout);

    const message = error instanceof Error ? error.message : "Unknown backend fetch error";

    if (error instanceof Error && error.name === "AbortError") {
      const timeoutSec = timeoutMs / 1000;
      logBackendWarning(
        `Request timeout after ${timeoutSec}s on ${path}. Check network connectivity.`
      );
      throw new Error(
        `Delai d'attente depasse apres ${timeoutSec}s. Verifie ta connexion reseau et reessaie.`
      );
    }

    if (error instanceof ApiResponseError) {
      const errorPreview = error.body ? ` - ${error.body.slice(0, 180)}` : "";
      logBackendWarning(
        `Request failed ${error.status} ${error.statusText} on ${path}${errorPreview}`
      );
      throw new Error(`Backend request failed: ${error.status} ${error.statusText}`);
    }

    const isNetworkFailure =
      error instanceof TypeError ||
      /fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT/i.test(message);

    if (isNetworkFailure) {
      logBackendWarning(
        `Unable to reach backend at ${backendUrl}. Verify API is running before opening protected pages.`
      );
      throw new Error(
        `Backend unavailable at ${backendUrl}. Verify NEXT_PUBLIC_API_URL and that the API is running.`
      );
    }

    if (!message.startsWith("Backend request failed:")) {
      logBackendWarning(`Unexpected error on ${path}: ${message}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function handleMockRequest<T>(path: string, init?: RequestInit): Promise<T> {
  console.log("[Mock API]", init?.method || "GET", path);

  await new Promise((resolve) => setTimeout(resolve, 500));

  const method = init?.method || "GET";

  switch (path) {
    case "/auth/login":
    case "/auth/register":
    case "/auth/temporary-access": {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      return mockAPI.auth(body) as Promise<T>;
    }
    case "/campaigns":
    case "/campaign":
      return mockAPI.getCampaigns() as Promise<T>;
    case "/employees":
      return mockAPI.getEmployees() as Promise<T>;
    case "/responses":
      return mockAPI.getResponses() as Promise<T>;
    default:
      if (path.includes("/campaign/participants")) {
        const campaignId = parseInt(path.split("/").pop() || "1", 10);
        return mockAPI.getCampaignParticipants(campaignId) as Promise<T>;
      }

      if (path.includes("/employees/") && method === "PATCH") {
        const employeeId = parseInt(path.split("/").pop() || "1", 10);
        const body = init?.body ? JSON.parse(init.body as string) : {};
        return mockAPI.updateEmployeeStatus(employeeId, body.status) as Promise<T>;
      }

      if (method === "POST" && path.includes("/campaign")) {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        return mockAPI.createCampaign(body) as Promise<T>;
      }

      return {} as T;
  }
}

export async function getBackendCollection<T>(path: string, token?: string) {
  return backendFetch<T[]>(path, token ? { headers: mergeHeaders(undefined, token) } : undefined);
}

export async function getBackendItem<T>(path: string, token?: string) {
  return backendFetch<T>(path, token ? { headers: mergeHeaders(undefined, token) } : undefined);
}

export async function postBackend<TResponse, TBody>(path: string, body: TBody, token?: string) {
  return backendFetch<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: mergeHeaders(undefined, token),
  });
}

export async function patchBackend<TResponse, TBody>(path: string, body: TBody, token?: string) {
  return backendFetch<TResponse>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: mergeHeaders(undefined, token),
  });
}

export async function deleteBackend<TResponse>(path: string, token?: string) {
  return backendFetch<TResponse>(path, {
    method: "DELETE",
    headers: mergeHeaders(undefined, token),
  });
}

export function getBackendUrl() {
  return resolveBackendUrl();
}
