const apiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

function normalizeApiBaseUrl(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw.replace(/\/+$/, "");
}
