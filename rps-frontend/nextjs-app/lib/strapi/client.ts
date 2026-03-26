import type { StrapiCollectionResponse, StrapiSingleResponse } from "@/lib/strapi/types";

const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
const strapiToken = process.env.STRAPI_API_TOKEN;

export function isStrapiConfigured() {
  return Boolean(strapiUrl);
}

type QueryValue = string | number | boolean | undefined;

function buildQuery(params?: Record<string, QueryValue>) {
  if (!params) return "";

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function strapiFetch<T>(path: string, params?: Record<string, QueryValue>) {
  if (!strapiUrl) {
    throw new Error("Strapi URL is not configured");
  }

  const response = await fetch(`${strapiUrl}${path}${buildQuery(params)}`, {
    headers: {
      "Content-Type": "application/json",
      ...(strapiToken ? { Authorization: `Bearer ${strapiToken}` } : {}),
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Strapi request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getStrapiCollection<T>(
  path: string,
  params?: Record<string, QueryValue>,
) {
  return strapiFetch<StrapiCollectionResponse<T>>(path, params);
}

export async function getStrapiSingle<T>(
  path: string,
  params?: Record<string, QueryValue>,
) {
  return strapiFetch<StrapiSingleResponse<T>>(path, params);
}
