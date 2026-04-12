import { ApiResponseError, apiFetch, getApiBaseUrl } from "@/lib/api";

function resolveBackendUrl() {
  return getApiBaseUrl();
}

export function isBackendConfigured() {
  const url = resolveBackendUrl();
  return Boolean(url);
}

function getAuthHeaders(customToken?: string): Record<string, string> {
  let token: string | null = customToken || null;

  if (!token && typeof window !== "undefined") {
    token = localStorage.getItem("auth_token");
  }

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

async function backendFetch<T>(path: string, init?: RequestInit) {
  const backendUrl = resolveBackendUrl();

  if (!backendUrl) {
    logBackendWarning("API URL is not configured.");
    throw new Error(
      "Backend API URL is not configured. Check NEXT_PUBLIC_API_URL environment variable."
    );
  }

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

    const message =
      error instanceof Error ? error.message : "Unknown backend fetch error";

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
      throw new Error("Backend unavailable");
    }

    if (!message.startsWith("Backend request failed:")) {
      logBackendWarning(`Unexpected error on ${path}: ${message}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
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
