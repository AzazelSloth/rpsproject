import "server-only";

import { cookies } from "next/headers";
import {
  deleteBackend,
  getBackendCollection,
  getBackendItem,
  patchBackend,
  postBackend,
} from "./client";

const DEMO_AUTH_TOKEN = "auth-disabled";

async function getServerAuthToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value?.trim();

  if (!token || token === DEMO_AUTH_TOKEN) {
    return undefined;
  }

  return token;
}

export async function getServerBackendCollection<T>(path: string) {
  return getBackendCollection<T>(path, await getServerAuthToken());
}

export async function getServerBackendItem<T>(path: string) {
  return getBackendItem<T>(path, await getServerAuthToken());
}

export async function postServerBackend<TResponse, TBody>(path: string, body: TBody) {
  return postBackend<TResponse, TBody>(path, body, await getServerAuthToken());
}

export async function patchServerBackend<TResponse, TBody>(path: string, body: TBody) {
  return patchBackend<TResponse, TBody>(path, body, await getServerAuthToken());
}

export async function deleteServerBackend<TResponse>(path: string) {
  return deleteBackend<TResponse>(path, await getServerAuthToken());
}
