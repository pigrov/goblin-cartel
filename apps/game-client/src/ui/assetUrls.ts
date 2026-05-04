import { apiUrl } from "./apiClient";

export function assetUrl(assetId: string | null | undefined): string | null {
  const cleanAssetId = assetId?.trim();

  if (!cleanAssetId) {
    return null;
  }

  return apiUrl(`/api/assets/${encodeURIComponent(cleanAssetId)}`);
}
