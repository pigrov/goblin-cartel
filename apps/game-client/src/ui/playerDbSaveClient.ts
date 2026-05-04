import type { BossCardDefinition } from "@goblin-cartel/game-core";
import { apiUrl } from "./apiClient";
import { readPlayerSave, writeStoredPlayerSave, type PlayerSaveStorage, type StoredPlayerSaveV1 } from "./playerSave";

export const playerDeviceTokenStorageKey = "goblin-cartel.player.device-token.v1";
export const playerServerSaveRevisionStorageKey = "goblin-cartel.player.server-save-revision.v1";

type FetchLike = typeof fetch;

interface ServerPlayerSave {
  schemaVersion: 1;
  contentVersion: string;
  revision: number;
  state: unknown;
  updatedAt: string;
}

interface PlayerBootstrapResponse {
  player: {
    id: string;
    displayName: string | null;
    createdAt: string;
    updatedAt: string;
    lastSeenAt: string;
  };
  device: {
    id: string;
    createdAt: string;
    lastSeenAt: string;
  };
  save: ServerPlayerSave | null;
  token?: string;
}

export interface PlayerVkIdentityProof {
  accessToken?: string;
  authorizationCode?: string;
  codeVerifier?: string;
  idToken?: string;
  redirectUri?: string;
}

interface PlayerVkIdentityLinkResponse {
  ok: true;
  identity: {
    provider: "vk_id";
    providerUserId: string;
    displayName: string | null;
    avatarUrl: string | null;
    linkedAt: string;
    lastSeenAt: string;
  };
  linkedExistingPlayer: boolean;
  player: {
    id: string;
    displayName: string | null;
    createdAt: string;
    updatedAt: string;
    lastSeenAt: string;
  };
  save: ServerPlayerSave | null;
}

interface SaveWriteResponse {
  save: ServerPlayerSave;
}

interface SaveConflictResponse {
  error: "revision_conflict";
  current?: ServerPlayerSave;
}

export interface PlayerDbLeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string | null;
  key: string;
  seasonId: string;
  value: number;
  updatedAt: string;
}

interface LeaderboardResponse {
  leaderboard: PlayerDbLeaderboardEntry[];
}

export interface PlayerDbScoreInput {
  key: string;
  seasonId?: string;
  value: number;
}

export type PlayerDbBootstrapResult =
  | {
      ok: true;
      appliedServerSave: boolean;
      issuedToken: boolean;
      serverRevision: number | null;
    }
  | {
      ok: false;
      code: "network_error" | "invalid_response";
    };

export type PlayerDbSaveUploadResult =
  | {
      ok: true;
      uploaded: true;
      revision: number;
      conflictResolved: boolean;
    }
  | {
      ok: true;
      uploaded: false;
      reason: "no_token" | "no_save" | "wrong_content_version";
    }
  | {
      ok: false;
      code: "invalid_session" | "revision_conflict" | "network_error" | "invalid_response";
      currentRevision?: number;
    };

export type PlayerDbScoresUploadResult =
  | {
      ok: true;
      uploaded: true;
      scoreCount: number;
    }
  | {
      ok: true;
      uploaded: false;
      reason: "no_token" | "no_scores";
    }
  | {
      ok: false;
      code: "invalid_session" | "network_error" | "invalid_response";
    };

export type PlayerDbLeaderboardResult =
  | {
      ok: true;
      leaderboard: PlayerDbLeaderboardEntry[];
    }
  | {
      ok: false;
      code: "network_error" | "invalid_response";
    };

export type PlayerVkIdentityLinkResult =
  | {
      ok: true;
      appliedServerSave: boolean;
      displayName: string | null;
      linkedExistingPlayer: boolean;
      providerUserId: string;
      serverRevision: number | null;
    }
  | {
      ok: false;
      code: "identity_verifier_not_configured" | "invalid_identity_token" | "invalid_session" | "network_error" | "invalid_response" | "no_token";
    };

type PlayerVkIdentityLinkErrorCode = Extract<PlayerVkIdentityLinkResult, { ok: false }>["code"];

export async function bootstrapPlayerDbSave(input: {
  contentVersion: string;
  definitions?: BossCardDefinition[];
  fetchImpl?: FetchLike;
  storage?: PlayerSaveStorage;
}): Promise<PlayerDbBootstrapResult> {
  const storage = input.storage ?? localStorage;
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = storage.getItem(playerDeviceTokenStorageKey);

  try {
    const response = await fetchImpl(apiUrl("/api/player/bootstrap"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: "{}"
    });

    if (!response.ok) {
      clearPlayerDbSession(storage);
      return { ok: false, code: "invalid_response" };
    }

    const payload = (await response.json()) as PlayerBootstrapResponse;

    if (payload.token) {
      storage.setItem(playerDeviceTokenStorageKey, payload.token);
    }

    if (!payload.save) {
      storage.removeItem(playerServerSaveRevisionStorageKey);
      return {
        ok: true,
        appliedServerSave: false,
        issuedToken: Boolean(payload.token),
        serverRevision: null
      };
    }

    const appliedServerSave = applyServerSaveToLocalStorage(payload.save, {
      contentVersion: input.contentVersion,
      definitions: input.definitions,
      storage
    });

    if (appliedServerSave) {
      storage.setItem(playerServerSaveRevisionStorageKey, String(payload.save.revision));
    }

    return {
      ok: true,
      appliedServerSave,
      issuedToken: Boolean(payload.token),
      serverRevision: payload.save.revision
    };
  } catch {
    return { ok: false, code: "network_error" };
  }
}

export async function linkPlayerVkIdentity(input: {
  contentVersion: string;
  definitions?: BossCardDefinition[];
  fetchImpl?: FetchLike;
  proof: PlayerVkIdentityProof;
  storage?: PlayerSaveStorage;
}): Promise<PlayerVkIdentityLinkResult> {
  const storage = input.storage ?? localStorage;
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = storage.getItem(playerDeviceTokenStorageKey);

  if (!token) {
    return { ok: false, code: "no_token" };
  }

  try {
    const response = await fetchImpl(apiUrl("/api/player/link/vk-id"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input.proof)
    });

    if (response.status === 401) {
      clearPlayerDbSession(storage);
      return { ok: false, code: "invalid_session" };
    }

    if (response.status === 400 || response.status === 503) {
      const payload = (await response.json()) as { error?: PlayerVkIdentityLinkErrorCode };
      const error = payload.error;

      if (error === "identity_verifier_not_configured" || error === "invalid_identity_token") {
        return { ok: false, code: error };
      }

      return { ok: false, code: "invalid_response" };
    }

    if (!response.ok) {
      return { ok: false, code: "invalid_response" };
    }

    const payload = (await response.json()) as PlayerVkIdentityLinkResponse;

    if (!isPlayerVkIdentityLinkResponse(payload)) {
      return { ok: false, code: "invalid_response" };
    }

    const appliedServerSave = payload.save
      ? applyServerSaveToLocalStorage(payload.save, {
          contentVersion: input.contentVersion,
          definitions: input.definitions,
          storage
        })
      : false;

    if (payload.save && appliedServerSave) {
      storage.setItem(playerServerSaveRevisionStorageKey, String(payload.save.revision));
    }

    return {
      ok: true,
      appliedServerSave,
      displayName: payload.identity.displayName ?? payload.player.displayName,
      linkedExistingPlayer: payload.linkedExistingPlayer,
      providerUserId: payload.identity.providerUserId,
      serverRevision: payload.save?.revision ?? null
    };
  } catch {
    return { ok: false, code: "network_error" };
  }
}

export async function uploadStoredPlayerDbSave(input: {
  contentVersion: string;
  definitions?: BossCardDefinition[];
  fetchImpl?: FetchLike;
  storage?: PlayerSaveStorage;
}): Promise<PlayerDbSaveUploadResult> {
  const storage = input.storage ?? localStorage;
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = storage.getItem(playerDeviceTokenStorageKey);

  if (!token) {
    return { ok: true, uploaded: false, reason: "no_token" };
  }

  const save = readPlayerSave(storage, input.definitions);

  if (!save) {
    return { ok: true, uploaded: false, reason: "no_save" };
  }

  if (save.contentVersion !== input.contentVersion) {
    return { ok: true, uploaded: false, reason: "wrong_content_version" };
  }

  const expectedRevision = readServerRevision(storage);

  try {
    const response = await writeSaveSnapshot({
      expectedRevision,
      fetchImpl,
      save,
      token
    });

    if (response.status === 401) {
      clearPlayerDbSession(storage);
      return { ok: false, code: "invalid_session" };
    }

    if (response.status === 409) {
      const conflict = (await response.json()) as SaveConflictResponse;
      const currentRevision = conflict.current?.revision;

      if (typeof currentRevision === "number") {
        const retry = await writeSaveSnapshot({
          expectedRevision: currentRevision,
          fetchImpl,
          save,
          token
        });

        if (retry.ok) {
          const retryPayload = (await retry.json()) as SaveWriteResponse;

          if (!retryPayload.save || typeof retryPayload.save.revision !== "number") {
            return { ok: false, code: "invalid_response" };
          }

          storage.setItem(playerServerSaveRevisionStorageKey, String(retryPayload.save.revision));

          return {
            ok: true,
            uploaded: true,
            revision: retryPayload.save.revision,
            conflictResolved: true
          };
        }
      }

      return {
        ok: false,
        code: "revision_conflict",
        ...(typeof currentRevision === "number" ? { currentRevision } : {})
      };
    }

    if (!response.ok) {
      return { ok: false, code: "invalid_response" };
    }

    const payload = (await response.json()) as SaveWriteResponse;

    if (!payload.save || typeof payload.save.revision !== "number") {
      return { ok: false, code: "invalid_response" };
    }

    storage.setItem(playerServerSaveRevisionStorageKey, String(payload.save.revision));

    return {
      ok: true,
      uploaded: true,
      revision: payload.save.revision,
      conflictResolved: false
    };
  } catch {
    return { ok: false, code: "network_error" };
  }
}

export async function uploadPlayerDbScores(input: {
  fetchImpl?: FetchLike;
  scores: PlayerDbScoreInput[];
  storage?: PlayerSaveStorage;
}): Promise<PlayerDbScoresUploadResult> {
  const storage = input.storage ?? localStorage;
  const fetchImpl = input.fetchImpl ?? fetch;
  const token = storage.getItem(playerDeviceTokenStorageKey);

  if (!token) {
    return { ok: true, uploaded: false, reason: "no_token" };
  }

  const scores = normalizeScoreInputs(input.scores);

  if (scores.length === 0) {
    return { ok: true, uploaded: false, reason: "no_scores" };
  }

  try {
    const response = await fetchImpl(apiUrl("/api/player/scores"), {
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ scores })
    });

    if (response.status === 401) {
      clearPlayerDbSession(storage);
      return { ok: false, code: "invalid_session" };
    }

    if (!response.ok) {
      return { ok: false, code: "invalid_response" };
    }

    return {
      ok: true,
      uploaded: true,
      scoreCount: scores.length
    };
  } catch {
    return { ok: false, code: "network_error" };
  }
}

export async function fetchPlayerDbLeaderboard(input: {
  fetchImpl?: FetchLike;
  limit?: number;
  scoreKey: string;
  seasonId?: string;
}): Promise<PlayerDbLeaderboardResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const scoreKey = input.scoreKey.trim();

  if (!scoreKey) {
    return { ok: false, code: "invalid_response" };
  }

  const params = new URLSearchParams();
  const seasonId = input.seasonId?.trim();

  if (seasonId) {
    params.set("seasonId", seasonId);
  }

  if (typeof input.limit === "number" && Number.isFinite(input.limit)) {
    params.set("limit", String(Math.max(1, Math.min(100, Math.trunc(input.limit)))));
  }

  const query = params.toString();

  try {
    const response = await fetchImpl(apiUrl(`/api/player/leaderboard/${encodeURIComponent(scoreKey)}${query ? `?${query}` : ""}`), {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return { ok: false, code: "invalid_response" };
    }

    const payload = (await response.json()) as LeaderboardResponse;

    if (!Array.isArray(payload.leaderboard)) {
      return { ok: false, code: "invalid_response" };
    }

    return {
      ok: true,
      leaderboard: payload.leaderboard.filter(isPlayerDbLeaderboardEntry)
    };
  } catch {
    return { ok: false, code: "network_error" };
  }
}

function writeSaveSnapshot(input: {
  expectedRevision: number | null;
  fetchImpl: FetchLike;
  save: StoredPlayerSaveV1;
  token: string;
}): Promise<Response> {
  return input.fetchImpl(apiUrl("/api/player/save"), {
    method: "PUT",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      schemaVersion: 1,
      contentVersion: input.save.contentVersion,
      ...(input.expectedRevision !== null ? { expectedRevision: input.expectedRevision } : {}),
      state: input.save
    })
  });
}

function applyServerSaveToLocalStorage(
  save: ServerPlayerSave,
  input: {
    contentVersion: string;
    definitions?: BossCardDefinition[];
    storage: PlayerSaveStorage;
  }
): boolean {
  if (save.schemaVersion !== 1 || save.contentVersion !== input.contentVersion) {
    return false;
  }

  const normalized = writeStoredPlayerSave(save.state, input.storage, input.definitions);
  return normalized?.contentVersion === input.contentVersion;
}

function readServerRevision(storage: PlayerSaveStorage): number | null {
  const raw = storage.getItem(playerServerSaveRevisionStorageKey);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function clearPlayerDbSession(storage: PlayerSaveStorage): void {
  storage.removeItem(playerDeviceTokenStorageKey);
  storage.removeItem(playerServerSaveRevisionStorageKey);
}

function normalizeScoreInputs(scores: readonly PlayerDbScoreInput[]): PlayerDbScoreInput[] {
  const byKey = new Map<string, PlayerDbScoreInput>();

  for (const score of scores) {
    const key = score.key.trim();
    const seasonId = score.seasonId?.trim() || "global";
    const value = normalizeScoreValue(score.value);

    if (!key || value === null) {
      continue;
    }

    byKey.set(`${key}:${seasonId}`, {
      key,
      seasonId,
      value
    });
  }

  return [...byKey.values()];
}

function normalizeScoreValue(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.trunc(value));
}

function isPlayerDbLeaderboardEntry(value: unknown): value is PlayerDbLeaderboardEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as PlayerDbLeaderboardEntry;

  return (
    typeof entry.rank === "number" &&
    typeof entry.playerId === "string" &&
    (entry.displayName === null || typeof entry.displayName === "string") &&
    typeof entry.key === "string" &&
    typeof entry.seasonId === "string" &&
    typeof entry.value === "number" &&
    typeof entry.updatedAt === "string"
  );
}

function isPlayerVkIdentityLinkResponse(value: unknown): value is PlayerVkIdentityLinkResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as PlayerVkIdentityLinkResponse;

  return (
    payload.ok === true &&
    typeof payload.linkedExistingPlayer === "boolean" &&
    Boolean(payload.player) &&
    typeof payload.player.id === "string" &&
    (payload.player.displayName === null || typeof payload.player.displayName === "string") &&
    Boolean(payload.identity) &&
    payload.identity.provider === "vk_id" &&
    typeof payload.identity.providerUserId === "string" &&
    (payload.identity.displayName === null || typeof payload.identity.displayName === "string") &&
    (payload.identity.avatarUrl === null || typeof payload.identity.avatarUrl === "string") &&
    (payload.save === null || isServerPlayerSave(payload.save))
  );
}

function isServerPlayerSave(value: unknown): value is ServerPlayerSave {
  if (!value || typeof value !== "object") {
    return false;
  }

  const save = value as ServerPlayerSave;

  return (
    save.schemaVersion === 1 &&
    typeof save.contentVersion === "string" &&
    typeof save.revision === "number" &&
    typeof save.updatedAt === "string"
  );
}
