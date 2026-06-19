import { appFetch } from "@/lib/api";

export type User = {
  id: number;
  email: string;
  name: string;
  created_at?: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  name: string;
  email: string;
  password: string;
};

export type ForgotPasswordCredentials = {
  email: string;
};

export type ResetPasswordCredentials = {
  token: string;
  password: string;
};

export type AuthMessageResponse = {
  message: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function readJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string; message?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && ("error" in payload || "message" in payload)
        ? payload.error || payload.message
        : null;

    throw new Error(message || "La requete d'authentification a echoue.");
  }

  return payload as T;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await appFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...credentials,
      email: normalizeEmail(credentials.email),
    }),
  });

  return readJsonOrThrow<AuthResponse>(response);
}

export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  const response = await appFetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...credentials,
      email: normalizeEmail(credentials.email),
    }),
  });

  return readJsonOrThrow<AuthResponse>(response);
}

export async function requestPasswordReset(
  credentials: ForgotPasswordCredentials,
): Promise<AuthMessageResponse> {
  const response = await appFetch("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: normalizeEmail(credentials.email),
    }),
  });

  return readJsonOrThrow<AuthMessageResponse>(response);
}

export async function resetPassword(
  credentials: ResetPasswordCredentials,
): Promise<AuthMessageResponse> {
  const response = await appFetch("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  return readJsonOrThrow<AuthMessageResponse>(response);
}

export async function logout() {
  await appFetch("/auth/logout", {
    method: "POST",
  });
}

export function saveAuth(_response: AuthResponse) {
  return;
}

export async function getSessionUser(): Promise<User | null> {
  const response = await appFetch("/auth/session", {
    method: "GET",
    cache: "no-store",
  });

  if (response.status === 401) {
    return null;
  }

  const payload = await readJsonOrThrow<{ user: User | null }>(response);
  return payload.user;
}

export function getUser(): User | null {
  return null;
}

export function isAuthenticated(): boolean {
  return false;
}
