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
    console.error("❌ Backend API URL is not configured");
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
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Backend request failed:`, {
        status: response.status,
        path,
        error: errorData,
      });
      throw new Error(
        `Backend request failed: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`❌ Fetch error for ${path}:`, error);
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
