const backendUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  process.env.API_URL?.replace(/\/$/, "");

export function isBackendConfigured() {
  return Boolean(backendUrl);
}

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
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

async function backendFetch<T>(path: string, init?: RequestInit) {
  if (!backendUrl) {
    throw new Error("Backend API URL is not configured");
  }

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: mergeHeaders(init?.headers),
    cache: init?.method && init.method !== "GET" ? "no-store" : "force-cache",
    next: init?.method && init.method !== "GET" ? undefined : { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return (await response.json()) as T;
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
