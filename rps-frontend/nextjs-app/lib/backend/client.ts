import { ApiResponseError, apiFetch, getApiBaseUrl } from "@/lib/api";

const READ_CACHE_TTL_MS = 5000;
const RATE_LIMIT_STALE_TTL_MS = 5 * 60 * 1000;

const inFlightReadRequests = new Map<string, Promise<unknown>>();
const readResponseCache = new Map<string, { createdAt: number; value: unknown }>();

export class BackendConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BackendConfigurationError";
  }
}

function resolveBackendUrl(): string | null {
  return getApiBaseUrl();
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

export function isBackendConfigured() {
  return Boolean(resolveBackendUrl());
}

function getAuthHeaders(customToken?: string): Record<string, string> {
  const token = customToken || null;

  return token ? { Authorization: `Bearer ${token}` } : {};
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

function getApiErrorMessage(body: string) {
  if (!body.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(body) as { message?: unknown; error?: unknown };
    const message = Array.isArray(parsed.message)
      ? parsed.message.join("; ")
      : typeof parsed.message === "string"
        ? parsed.message
        : null;

    if (message) {
      return message;
    }

    return typeof parsed.error === "string" ? parsed.error : null;
  } catch {
    return body.slice(0, 240);
  }
}

function getRequestMethod(init?: RequestInit) {
  return (init?.method ?? "GET").toUpperCase();
}

function isReadRequest(init?: RequestInit) {
  const method = getRequestMethod(init);
  return method === "GET" || method === "HEAD";
}

function getRequestBodyKey(body?: BodyInit | null) {
  if (!body) {
    return "";
  }

  if (typeof body === "string") {
    return body;
  }

  return "[non-string-body]";
}

function buildReadRequestKey(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const authorization = headers.get("authorization") ?? "";

  return [
    getRequestMethod(init),
    path,
    authorization,
    getRequestBodyKey(init?.body),
  ].join(" ");
}

function getCachedReadValue<T>(requestKey: string, maxAgeMs: number) {
  const cached = readResponseCache.get(requestKey);

  if (!cached) {
    return { hit: false as const };
  }

  const cacheAge = Date.now() - cached.createdAt;

  if (cacheAge > maxAgeMs) {
    if (cacheAge > RATE_LIMIT_STALE_TTL_MS) {
      readResponseCache.delete(requestKey);
    }

    return { hit: false as const };
  }

  return { hit: true as const, value: cached.value as T };
}

function rememberReadValue(requestKey: string, value: unknown) {
  readResponseCache.set(requestKey, {
    createdAt: Date.now(),
    value,
  });
}

function clearReadCacheAfterWrite(init?: RequestInit) {
  if (!isReadRequest(init)) {
    readResponseCache.clear();
  }
}

async function backendFetchAttempt<T>(path: string, init: RequestInit | undefined) {
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
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBackendError(path: string, error: unknown, backendUrl: string): Error {
  const message = error instanceof Error ? error.message : "Unknown backend fetch error";
  const timeoutMs = path.includes("/import-employees") ? 120000 : 30000;

  if (error instanceof Error && error.name === "AbortError") {
    const timeoutSec = timeoutMs / 1000;
    logBackendWarning(
      `Request timeout after ${timeoutSec}s on ${path}. Check network connectivity.`
    );
    return new Error(
      `Delai d'attente depasse apres ${timeoutSec}s. Verifie ta connexion reseau et reessaie.`
    );
  }

  if (error instanceof ApiResponseError) {
    const errorPreview = error.body ? ` - ${error.body.slice(0, 180)}` : "";
    const apiMessage = getApiErrorMessage(error.body);
    logBackendWarning(
      `Request failed ${error.status} ${error.statusText} on ${path}${errorPreview}`
    );

    if (error.status === 429) {
      return new Error(
        apiMessage ||
          "Le serveur recoit trop de demandes en meme temps. Patiente quelques secondes puis reessaie.",
      );
    }

    return new Error(
      apiMessage
        ? `Backend request failed: ${error.status} ${error.statusText} - ${apiMessage}`
        : `Backend request failed: ${error.status} ${error.statusText}`,
    );
  }

  const isNetworkFailure =
    error instanceof TypeError ||
    /fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT/i.test(message);

  if (isNetworkFailure) {
    logBackendWarning(
      `Unable to reach backend at ${backendUrl}. Verify API is running before opening protected pages.`
    );
    return new Error(
      `Backend unavailable at ${backendUrl}. Verify NEXT_PUBLIC_API_URL and that the API is running.`
    );
  }

  if (!message.startsWith("Backend request failed:")) {
    logBackendWarning(`Unexpected error on ${path}: ${message}`);
  }

  return error instanceof Error ? error : new Error(message);
}

async function backendFetchWithRetry<T>(
  path: string,
  init: RequestInit | undefined,
  requestKey: string | null,
) {
  const backendUrl = getRequiredBackendUrl();
  const maxAttempts = 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const value = await backendFetchAttempt<T>(path, init);

      if (requestKey) {
        rememberReadValue(requestKey, value);
      } else {
        clearReadCacheAfterWrite(init);
      }

      return value;
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 429 && requestKey) {
        const staleValue = getCachedReadValue<T>(requestKey, RATE_LIMIT_STALE_TTL_MS);

        if (staleValue.hit) {
          logBackendWarning(`Rate limit on ${path}; serving cached data.`);
          return staleValue.value;
        }
      }

      throw normalizeBackendError(path, error, backendUrl);
    }
  }

  throw new Error("Backend request failed after retry attempts.");
}

async function backendFetch<T>(path: string, init?: RequestInit) {
  const requestKey = isReadRequest(init) ? buildReadRequestKey(path, init) : null;

  if (requestKey) {
    const cachedValue = getCachedReadValue<T>(requestKey, READ_CACHE_TTL_MS);

    if (cachedValue.hit) {
      return cachedValue.value;
    }

    const inFlightRequest = inFlightReadRequests.get(requestKey);

    if (inFlightRequest) {
      return inFlightRequest as Promise<T>;
    }
  }

  const requestPromise = backendFetchWithRetry<T>(path, init, requestKey);

  if (!requestKey) {
    return requestPromise;
  }

  inFlightReadRequests.set(requestKey, requestPromise);

  try {
    return await requestPromise;
  } catch (error) {
    throw error;
  } finally {
    inFlightReadRequests.delete(requestKey);
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
