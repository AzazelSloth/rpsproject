import { postBackend } from "./client";

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  return postBackend<AuthResponse, LoginCredentials>("/auth/login", {
    ...credentials,
    email: normalizeEmail(credentials.email),
  });
}

export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  return postBackend<AuthResponse, RegisterCredentials>("/auth/register", {
    ...credentials,
    email: normalizeEmail(credentials.email),
  });
}

export async function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }
}

export function saveAuth(response: AuthResponse) {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth_token", response.token);
    localStorage.setItem("auth_user", JSON.stringify(response.user));
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
}

export function getUser(): User | null {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("auth_user");
    if (userStr) {
      return JSON.parse(userStr);
    }
  }
  return null;
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
