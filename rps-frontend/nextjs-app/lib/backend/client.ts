function resolveBackendUrl() {
  const isServer = typeof window === "undefined";

  // Côté serveur (Node.js/SSR) - a TOUJOURS besoin d'une URL absolue
  if (isServer) {
    // IMPORTANT: process.env.API_URL est lu au RUNTIME (PM2), pas au build
    const runtimeApiUrl = process.env.API_URL?.trim();

    // Si PM2 a défini API_URL avec une URL absolue, on l'utilise
    if (runtimeApiUrl && runtimeApiUrl.startsWith('http')) {
      return runtimeApiUrl.replace(/\/$/, "");
    }

    // Fallback: try NEXT_PUBLIC_API_URL if it's an absolute URL
    const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (publicUrl && publicUrl.startsWith('http')) {
      return publicUrl.replace(/\/$/, "");
    }

    // Sinon, fallback garanti: localhost (backend sur le même serveur)
    // On N'utilise JAMAIS "/api" côté serveur car Node.js ne supporte pas les URLs relatives
    return "http://127.0.0.1:3000/api";
  }

  // Côté navigateur - peut utiliser des chemins relatifs (proxy Nginx)
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicUrl) {
    return publicUrl.replace(/\/$/, "");
  }

  return "/api";
}

export function isBackendConfigured() {
  const url = resolveBackendUrl();
  return Boolean(url);
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
  // Résolution dynamique à CHAQUE appel pour éviter les problèmes de cache module
  const backendUrl = resolveBackendUrl();

  if (!backendUrl) {
    logBackendWarning("API URL is not configured.");
    throw new Error(
      "Backend API URL is not configured. Check NEXT_PUBLIC_API_URL environment variable."
    );
  }

  const controller = new AbortController();
  const timeoutMs = path.includes('/import-employees') ? 120000 : 30000; // 2min for import, 30s for others
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${backendUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: mergeHeaders(init?.headers),
      cache: "no-store",
    });

    clearTimeout(timeout);

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
    clearTimeout(timeout);

    const message =
      error instanceof Error ? error.message : "Unknown backend fetch error";

    // Check for abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutSec = timeoutMs / 1000;
      logBackendWarning(
        `Request timeout after ${timeoutSec}s on ${path}. Check network connectivity.`
      );
      throw new Error(
        `Délai d'attente dépassé après ${timeoutSec}s. Vérifie ta connexion réseau et réessaie.`
      );
    }

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
  return resolveBackendUrl();
}
