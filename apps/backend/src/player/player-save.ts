import { createHash, randomBytes } from "node:crypto";

export interface PlayerRecord {
  id: string;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface PlayerDeviceRecord {
  id: string;
  playerId: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export type PlayerIdentityProvider = "vk_id";

export interface PlayerIdentityRecord {
  id: string;
  playerId: string;
  provider: PlayerIdentityProvider;
  providerUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface PlayerSaveRecord {
  playerId: string;
  schemaVersion: number;
  contentVersion: string;
  revision: number;
  state: unknown;
  updatedAt: Date;
}

export interface PlayerScoreRecord {
  id: string;
  playerId: string;
  scoreKey: string;
  seasonId: string;
  value: number;
  updatedAt: Date;
}

export interface PlayerLeaderboardEntryRecord {
  playerId: string;
  displayName: string | null;
  scoreKey: string;
  seasonId: string;
  value: number;
  updatedAt: Date;
}

export interface AuthenticatedPlayerRecord {
  player: PlayerRecord;
  device: PlayerDeviceRecord;
}

export interface LinkedPlayerIdentityRecord {
  identity: PlayerIdentityRecord;
  player: PlayerRecord;
}

export interface VerifiedPlayerIdentity {
  avatarUrl?: string | null;
  displayName?: string | null;
  provider: PlayerIdentityProvider;
  providerUserId: string;
}

export interface VkIdentityProof {
  accessToken?: string;
  authorizationCode?: string;
  codeVerifier?: string;
  idToken?: string;
  redirectUri?: string;
}

export interface PlayerIdentityVerifier {
  verifyVkIdentity(input: VkIdentityProof): Promise<VerifiedPlayerIdentity | null>;
}

export class PlayerIdentityVerifierNotConfiguredError extends Error {
  override name = "PlayerIdentityVerifierNotConfiguredError";

  constructor() {
    super("Player identity verifier is not configured");
  }
}

export type SaveWriteResult =
  | {
      ok: true;
      save: PlayerSaveRecord;
    }
  | {
      ok: false;
      code: "revision_conflict";
      current: PlayerSaveRecord;
    };

export interface PlayerSaveStore {
  createPlayerWithDevice(input: {
    displayName: string | null;
    tokenHash: string;
    now: Date;
  }): Promise<AuthenticatedPlayerRecord>;
  findPlayerByDeviceTokenHash(tokenHash: string): Promise<AuthenticatedPlayerRecord | null>;
  touchPlayerDevice(input: { playerId: string; deviceId: string; now: Date }): Promise<AuthenticatedPlayerRecord>;
  movePlayerDevice(input: { deviceId: string; playerId: string; now: Date }): Promise<AuthenticatedPlayerRecord>;
  findPlayerIdentity(input: {
    provider: PlayerIdentityProvider;
    providerUserId: string;
  }): Promise<LinkedPlayerIdentityRecord | null>;
  linkPlayerIdentity(input: {
    avatarUrl: string | null;
    displayName: string | null;
    playerId: string;
    provider: PlayerIdentityProvider;
    providerUserId: string;
    now: Date;
  }): Promise<LinkedPlayerIdentityRecord>;
  findSave(playerId: string): Promise<PlayerSaveRecord | null>;
  writeSave(input: {
    playerId: string;
    schemaVersion: 1;
    contentVersion: string;
    expectedRevision?: number;
    state: unknown;
    now: Date;
  }): Promise<SaveWriteResult>;
  upsertScores(input: {
    playerId: string;
    scores: Array<{
      scoreKey: string;
      seasonId: string;
      value: number;
    }>;
    now: Date;
  }): Promise<PlayerScoreRecord[]>;
  listLeaderboard(input: { scoreKey: string; seasonId: string; limit: number }): Promise<PlayerLeaderboardEntryRecord[]>;
}

export interface PublicPlayer {
  id: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

export interface PublicPlayerDevice {
  id: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface PublicPlayerIdentity {
  provider: PlayerIdentityProvider;
  providerUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  linkedAt: string;
  lastSeenAt: string;
}

export interface PublicPlayerSave {
  schemaVersion: 1;
  contentVersion: string;
  revision: number;
  state: unknown;
  updatedAt: string;
}

export interface PublicPlayerScore {
  key: string;
  seasonId: string;
  value: number;
  updatedAt: string;
}

export interface PublicPlayerLeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string | null;
  key: string;
  seasonId: string;
  value: number;
  updatedAt: string;
}

export interface PlayerBootstrapSuccess {
  player: PublicPlayer;
  device: PublicPlayerDevice;
  save: PublicPlayerSave | null;
  token?: string;
}

export type PlayerSessionResult =
  | {
      ok: true;
      value: PlayerBootstrapSuccess;
    }
  | {
      ok: false;
      code: "invalid_player_session";
    };

export type PlayerSaveResult =
  | {
      ok: true;
      save: PublicPlayerSave | null;
    }
  | {
      ok: false;
      code: "invalid_player_session";
    };

export type PlayerSaveWriteResult =
  | {
      ok: true;
      save: PublicPlayerSave;
    }
  | {
      ok: false;
      code: "invalid_player_session" | "revision_conflict";
      current?: PublicPlayerSave;
    };

export type PlayerScoreWriteResult =
  | {
      ok: true;
      scores: PublicPlayerScore[];
    }
  | {
      ok: false;
      code: "invalid_player_session";
    };

export interface PlayerLeaderboardResult {
  leaderboard: PublicPlayerLeaderboardEntry[];
}

export type PlayerIdentityLinkResult =
  | {
      ok: true;
      device: PublicPlayerDevice;
      identity: PublicPlayerIdentity;
      linkedExistingPlayer: boolean;
      player: PublicPlayer;
      save: PublicPlayerSave | null;
    }
  | {
      ok: false;
      code: "identity_verifier_not_configured" | "invalid_identity_token" | "invalid_player_session";
    };

export interface PlayerSaveService {
  bootstrap(input: { token?: string; displayName?: string | null }): Promise<PlayerSessionResult>;
  getSave(token: string | null): Promise<PlayerSaveResult>;
  writeSave(
    token: string | null,
    input: {
      schemaVersion: 1;
      contentVersion: string;
      expectedRevision?: number;
      state: unknown;
    }
  ): Promise<PlayerSaveWriteResult>;
  upsertScores(
    token: string | null,
    input: {
      scores: Array<{
        key: string;
        seasonId?: string;
        value: number;
      }>;
    }
  ): Promise<PlayerScoreWriteResult>;
  listLeaderboard(input: { scoreKey: string; seasonId?: string; limit?: number }): Promise<PlayerLeaderboardResult>;
  linkVkIdentity(token: string | null, input: VkIdentityProof): Promise<PlayerIdentityLinkResult>;
}

export function hashPlayerDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createPlayerSaveService(options: {
  identityVerifier?: PlayerIdentityVerifier;
  now?: () => Date;
  store: PlayerSaveStore;
}): PlayerSaveService {
  const now = options.now ?? (() => new Date());

  async function authenticate(token: string | null): Promise<AuthenticatedPlayerRecord | null> {
    if (!token) {
      return null;
    }

    const record = await options.store.findPlayerByDeviceTokenHash(hashPlayerDeviceToken(token));

    if (!record) {
      return null;
    }

    return options.store.touchPlayerDevice({
      playerId: record.player.id,
      deviceId: record.device.id,
      now: now()
    });
  }

  return {
    async bootstrap(input) {
      const existing = await authenticate(input.token ?? null);

      if (existing) {
        const save = await options.store.findSave(existing.player.id);

        return {
          ok: true,
          value: {
            player: toPublicPlayer(existing.player),
            device: toPublicDevice(existing.device),
            save: toPublicSave(save)
          }
        };
      }

      const token = randomBytes(32).toString("base64url");
      const created = await options.store.createPlayerWithDevice({
        displayName: normalizeDisplayName(input.displayName),
        tokenHash: hashPlayerDeviceToken(token),
        now: now()
      });

      return {
        ok: true,
        value: {
          player: toPublicPlayer(created.player),
          device: toPublicDevice(created.device),
          save: null,
          token
        }
      };
    },

    async getSave(token) {
      const auth = await authenticate(token);

      if (!auth) {
        return { ok: false, code: "invalid_player_session" };
      }

      return {
        ok: true,
        save: toPublicSave(await options.store.findSave(auth.player.id))
      };
    },

    async writeSave(token, input) {
      const auth = await authenticate(token);

      if (!auth) {
        return { ok: false, code: "invalid_player_session" };
      }

      const result = await options.store.writeSave({
        playerId: auth.player.id,
        schemaVersion: input.schemaVersion,
        contentVersion: input.contentVersion,
        expectedRevision: input.expectedRevision,
        state: input.state,
        now: now()
      });

      if (!result.ok) {
        return {
          ok: false,
          code: result.code,
          current: toPublicSave(result.current) ?? undefined
        };
      }

      return { ok: true, save: toPublicSaveRecord(result.save) };
    },

    async upsertScores(token, input) {
      const auth = await authenticate(token);

      if (!auth) {
        return { ok: false, code: "invalid_player_session" };
      }

      const scores = await options.store.upsertScores({
        playerId: auth.player.id,
        scores: input.scores.map((score) => ({
          scoreKey: score.key,
          seasonId: score.seasonId ?? "global",
          value: score.value
        })),
        now: now()
      });

      return {
        ok: true,
        scores: scores.map(toPublicScore)
      };
    },

    async listLeaderboard(input) {
      const scoreKey = normalizeScoreKey(input.scoreKey);

      if (!scoreKey) {
        return { leaderboard: [] };
      }

      const entries = await options.store.listLeaderboard({
        scoreKey,
        seasonId: normalizeSeasonId(input.seasonId),
        limit: normalizeLeaderboardLimit(input.limit)
      });

      return {
        leaderboard: entries.map((entry, index) => toPublicLeaderboardEntry(entry, index + 1))
      };
    },

    async linkVkIdentity(token, input) {
      const auth = await authenticate(token);

      if (!auth) {
        return { ok: false, code: "invalid_player_session" };
      }

      if (!options.identityVerifier) {
        return { ok: false, code: "identity_verifier_not_configured" };
      }

      let verified: VerifiedPlayerIdentity | null;

      try {
        verified = await options.identityVerifier.verifyVkIdentity(input);
      } catch (error) {
        if (error instanceof PlayerIdentityVerifierNotConfiguredError) {
          return { ok: false, code: "identity_verifier_not_configured" };
        }

        throw error;
      }

      if (!verified || verified.provider !== "vk_id") {
        return { ok: false, code: "invalid_identity_token" };
      }

      const normalizedIdentity = {
        avatarUrl: normalizeOptionalUrl(verified.avatarUrl),
        displayName: normalizeDisplayName(verified.displayName),
        provider: verified.provider,
        providerUserId: normalizeProviderUserId(verified.providerUserId)
      };

      if (!normalizedIdentity.providerUserId) {
        return { ok: false, code: "invalid_identity_token" };
      }

      const existingIdentity = await options.store.findPlayerIdentity({
        provider: normalizedIdentity.provider,
        providerUserId: normalizedIdentity.providerUserId
      });
      const nowValue = now();

      if (existingIdentity && existingIdentity.player.id !== auth.player.id) {
        const movedAuth = await options.store.movePlayerDevice({
          deviceId: auth.device.id,
          playerId: existingIdentity.player.id,
          now: nowValue
        });
        const linked = await options.store.linkPlayerIdentity({
          ...normalizedIdentity,
          playerId: existingIdentity.player.id,
          now: nowValue
        });
        const save = await options.store.findSave(existingIdentity.player.id);

        return {
          ok: true,
          device: toPublicDevice(movedAuth.device),
          identity: toPublicIdentity(linked.identity),
          linkedExistingPlayer: true,
          player: toPublicPlayer(linked.player),
          save: toPublicSave(save)
        };
      }

      const linked = await options.store.linkPlayerIdentity({
        ...normalizedIdentity,
        playerId: auth.player.id,
        now: nowValue
      });
      const save = await options.store.findSave(linked.player.id);

      return {
        ok: true,
        device: toPublicDevice(auth.device),
        identity: toPublicIdentity(linked.identity),
        linkedExistingPlayer: false,
        player: toPublicPlayer(linked.player),
        save: toPublicSave(save)
      };
    }
  };
}

function normalizeDisplayName(displayName: string | null | undefined): string | null {
  const normalized = displayName?.trim();
  return normalized ? normalized.slice(0, 80) : null;
}

function normalizeScoreKey(scoreKey: string): string {
  return scoreKey.trim().slice(0, 80);
}

function normalizeProviderUserId(providerUserId: string): string {
  return providerUserId.trim().slice(0, 120);
}

function normalizeOptionalUrl(url: string | null | undefined): string | null {
  const normalized = url?.trim();
  return normalized ? normalized.slice(0, 500) : null;
}

function normalizeSeasonId(seasonId: string | null | undefined): string {
  const normalized = seasonId?.trim();
  return normalized ? normalized.slice(0, 80) : "global";
}

function normalizeLeaderboardLimit(limit: number | null | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return 50;
  }

  return Math.max(1, Math.min(100, Math.trunc(limit)));
}

function toPublicPlayer(player: PlayerRecord): PublicPlayer {
  return {
    id: player.id,
    displayName: player.displayName,
    createdAt: player.createdAt.toISOString(),
    updatedAt: player.updatedAt.toISOString(),
    lastSeenAt: player.lastSeenAt.toISOString()
  };
}

function toPublicDevice(device: PlayerDeviceRecord): PublicPlayerDevice {
  return {
    id: device.id,
    createdAt: device.createdAt.toISOString(),
    lastSeenAt: device.lastSeenAt.toISOString()
  };
}

function toPublicIdentity(identity: PlayerIdentityRecord): PublicPlayerIdentity {
  return {
    provider: identity.provider,
    providerUserId: identity.providerUserId,
    displayName: identity.displayName,
    avatarUrl: identity.avatarUrl,
    linkedAt: identity.createdAt.toISOString(),
    lastSeenAt: identity.lastSeenAt.toISOString()
  };
}

function toPublicSave(save: PlayerSaveRecord | null): PublicPlayerSave | null {
  if (!save) {
    return null;
  }

  return toPublicSaveRecord(save);
}

function toPublicSaveRecord(save: PlayerSaveRecord): PublicPlayerSave {
  return {
    schemaVersion: 1,
    contentVersion: save.contentVersion,
    revision: save.revision,
    state: save.state,
    updatedAt: save.updatedAt.toISOString()
  };
}

function toPublicScore(score: PlayerScoreRecord): PublicPlayerScore {
  return {
    key: score.scoreKey,
    seasonId: score.seasonId,
    value: score.value,
    updatedAt: score.updatedAt.toISOString()
  };
}

function toPublicLeaderboardEntry(entry: PlayerLeaderboardEntryRecord, rank: number): PublicPlayerLeaderboardEntry {
  return {
    rank,
    playerId: entry.playerId,
    displayName: entry.displayName,
    key: entry.scoreKey,
    seasonId: entry.seasonId,
    value: entry.value,
    updatedAt: entry.updatedAt.toISOString()
  };
}
