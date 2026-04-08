function resolveBackendUrl() {
  const isServer = typeof window === "undefined";
  const candidates = isServer
    ? [process.env.API_URL, process.env.NEXT_PUBLIC_API_URL]
    : [process.env.NEXT_PUBLIC_API_URL, process.env.API_URL];

  for (const candidate of candidates) {
    const normalized = candidate?.trim();
    if (normalized) {
      return normalized.replace(/\/$/, "");
    }
  }

  return isServer ? "http://127.0.0.1:3000/api" : "/api";
}

const backendUrl = resolveBackendUrl();

export function isBackendConfigured() {
  return Boolean(backendUrl);
}

function getAuthHeaders() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function mergeHeaders(initHeaders?: HeadersInit) {
  const headers = new Headers(initHeaders);
  headers.set("Content-Type", "application/json");

  for (const [key, value] of Object.entries(getAuthHeaders())) {
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
  if (!backendUrl) {
    logBackendWarning("API URL is not configured.");
    throw new Error(
      "Backend API URL is not configured. Check NEXT_PUBLIC_API_URL environment variable."
    );
  }

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: mergeHeaders(init?.headers),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const errorPreview = errorText ? ` - ${errorText.slice(0, 180)}` : "";
      logBackendWarning(
        `Request failed ${response.status} ${response.statusText} on ${path}${errorPreview}`
      );
      throw new Error(
        `Backend request failed: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown backend fetch error";
    const isNetworkFailure =
      error instanceof TypeError ||
      /fetch failed|ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT/i.test(
        message
      );

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
  }
}

export async function getBackendCollection<T>(path: string) {
  return backendFetch<T[]>(path);
}

export async function getBackendItem<T>(path: string) {
  return backendFetch<T>(path);
}

export async function postBackend<TResponse, TBody>(path: string, body: TBody) {
  return backendFetch<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchBackend<TResponse, TBody>(path: string, body: TBody) {
  return backendFetch<TResponse>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteBackend<TResponse>(path: string) {
  return backendFetch<TResponse>(path, {
    method: "DELETE",
  });
}

export function getBackendUrl() {
  return backendUrl;
}
