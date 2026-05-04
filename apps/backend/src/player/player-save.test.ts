import { describe, expect, it } from "vitest";
import {
  createPlayerSaveService,
  type AuthenticatedPlayerRecord,
  type PlayerLeaderboardEntryRecord,
  type PlayerDeviceRecord,
  type PlayerIdentityRecord,
  type PlayerRecord,
  type PlayerSaveRecord,
  type PlayerSaveStore,
  type PlayerScoreRecord,
  type SaveWriteResult
} from "./player-save.js";

const now = new Date("2026-05-03T10:00:00.000Z");

describe("player save service", () => {
  it("creates anonymous player identity and restores it by device token", async () => {
    const service = createPlayerSaveService({ store: new MemoryPlayerSaveStore(), now: () => now });

    const created = await service.bootstrap({ displayName: "  Крикк  " });
    expect(created.ok).toBe(true);

    if (!created.ok) {
      throw new Error("Expected player bootstrap success");
    }

    expect(created.value.token).toEqual(expect.any(String));
    expect(created.value.player).toMatchObject({
      id: "player-1",
      displayName: "Крикк",
      lastSeenAt: now.toISOString()
    });

    const restored = await service.bootstrap({ token: created.value.token });
    expect(restored.ok).toBe(true);

    if (!restored.ok) {
      throw new Error("Expected restored player success");
    }

    expect(restored.value.token).toBeUndefined();
    expect(restored.value.player.id).toBe(created.value.player.id);
    expect(restored.value.device.id).toBe(created.value.device.id);
  });

  it("writes versioned save snapshots and rejects stale revisions", async () => {
    const service = createPlayerSaveService({ store: new MemoryPlayerSaveStore(), now: () => now });
    const bootstrap = await service.bootstrap({});

    if (!bootstrap.ok || !bootstrap.value.token) {
      throw new Error("Expected player token");
    }

    const first = await service.writeSave(bootstrap.value.token, {
      schemaVersion: 1,
      contentVersion: "0.0.18",
      state: {
        resources: {
          gold: 600
        }
      }
    });

    expect(first).toMatchObject({
      ok: true,
      save: {
        contentVersion: "0.0.18",
        revision: 1
      }
    });

    const second = await service.writeSave(bootstrap.value.token, {
      schemaVersion: 1,
      contentVersion: "0.0.18",
      expectedRevision: 1,
      state: {
        resources: {
          gold: 700
        }
      }
    });

    expect(second).toMatchObject({
      ok: true,
      save: {
        revision: 2
      }
    });

    const stale = await service.writeSave(bootstrap.value.token, {
      schemaVersion: 1,
      contentVersion: "0.0.18",
      expectedRevision: 1,
      state: {
        resources: {
          gold: 800
        }
      }
    });

    expect(stale).toMatchObject({
      ok: false,
      code: "revision_conflict",
      current: {
        revision: 2
      }
    });

    const loaded = await service.getSave(bootstrap.value.token);
    expect(loaded).toMatchObject({
      ok: true,
      save: {
        revision: 2,
        state: {
          resources: {
            gold: 700
          }
        }
      }
    });
  });

  it("upserts score rows for future leaderboards", async () => {
    const service = createPlayerSaveService({ store: new MemoryPlayerSaveStore(), now: () => now });
    const bootstrap = await service.bootstrap({});

    if (!bootstrap.ok || !bootstrap.value.token) {
      throw new Error("Expected player token");
    }

    const first = await service.upsertScores(bootstrap.value.token, {
      scores: [{ key: "mine_depth", value: 10 }]
    });

    expect(first).toMatchObject({
      ok: true,
      scores: [
        {
          key: "mine_depth",
          seasonId: "global",
          value: 10
        }
      ]
    });

    const second = await service.upsertScores(bootstrap.value.token, {
      scores: [{ key: "mine_depth", value: 14 }]
    });

    expect(second).toMatchObject({
      ok: true,
      scores: [
        {
          key: "mine_depth",
          value: 14
        }
      ]
    });
  });

  it("lists leaderboard rows by score key and season", async () => {
    const service = createPlayerSaveService({ store: new MemoryPlayerSaveStore(), now: () => now });
    const first = await service.bootstrap({ displayName: "First" });
    const second = await service.bootstrap({ displayName: "Second" });

    if (!first.ok || !first.value.token || !second.ok || !second.value.token) {
      throw new Error("Expected player tokens");
    }

    await service.upsertScores(first.value.token, {
      scores: [{ key: "mine_depth", value: 10 }]
    });
    await service.upsertScores(second.value.token, {
      scores: [{ key: "mine_depth", value: 14 }]
    });

    const result = await service.listLeaderboard({
      scoreKey: " mine_depth ",
      limit: 1
    });

    expect(result).toEqual({
      leaderboard: [
        {
          rank: 1,
          playerId: "player-2",
          displayName: "Second",
          key: "mine_depth",
          seasonId: "global",
          value: 14,
          updatedAt: now.toISOString()
        }
      ]
    });
  });

  it("links a verified VK ID identity to the current player", async () => {
    const service = createPlayerSaveService({
      store: new MemoryPlayerSaveStore(),
      now: () => now,
      identityVerifier: {
        async verifyVkIdentity() {
          return {
            provider: "vk_id",
            providerUserId: "vk-user-1",
            displayName: "Крикк",
            avatarUrl: "https://example.test/avatar.png"
          };
        }
      }
    });
    const bootstrap = await service.bootstrap({});

    if (!bootstrap.ok || !bootstrap.value.token) {
      throw new Error("Expected player token");
    }

    const linked = await service.linkVkIdentity(bootstrap.value.token, {
      accessToken: "verified-token"
    });

    expect(linked).toMatchObject({
      ok: true,
      linkedExistingPlayer: false,
      player: {
        id: "player-1",
        displayName: "Крикк"
      },
      identity: {
        provider: "vk_id",
        providerUserId: "vk-user-1",
        displayName: "Крикк",
        avatarUrl: "https://example.test/avatar.png"
      }
    });
  });

  it("moves a new device to the existing player when VK ID is already linked", async () => {
    const store = new MemoryPlayerSaveStore();
    const service = createPlayerSaveService({
      store,
      now: () => now,
      identityVerifier: {
        async verifyVkIdentity() {
          return {
            provider: "vk_id",
            providerUserId: "vk-user-1",
            displayName: "Крикк"
          };
        }
      }
    });
    const first = await service.bootstrap({});

    if (!first.ok || !first.value.token) {
      throw new Error("Expected first player token");
    }

    const linked = await service.linkVkIdentity(first.value.token, {
      accessToken: "verified-token"
    });
    expect(linked).toMatchObject({ ok: true, linkedExistingPlayer: false });

    const second = await service.bootstrap({});

    if (!second.ok || !second.value.token) {
      throw new Error("Expected second player token");
    }

    const restored = await service.linkVkIdentity(second.value.token, {
      accessToken: "verified-token"
    });

    expect(restored).toMatchObject({
      ok: true,
      linkedExistingPlayer: true,
      player: {
        id: "player-1",
        displayName: "Крикк"
      }
    });

    const save = await service.getSave(second.value.token);
    expect(save).toMatchObject({
      ok: true
    });
  });
});

class MemoryPlayerSaveStore implements PlayerSaveStore {
  private readonly devices = new Map<string, PlayerDeviceRecord>();
  private readonly players = new Map<string, PlayerRecord>();
  private readonly identities = new Map<string, PlayerIdentityRecord>();
  private readonly saves = new Map<string, PlayerSaveRecord>();
  private readonly scores = new Map<string, PlayerScoreRecord>();

  async createPlayerWithDevice(input: {
    displayName: string | null;
    tokenHash: string;
    now: Date;
  }): Promise<AuthenticatedPlayerRecord> {
    const player: PlayerRecord = {
      id: `player-${this.players.size + 1}`,
      displayName: input.displayName,
      createdAt: input.now,
      updatedAt: input.now,
      lastSeenAt: input.now
    };
    const device: PlayerDeviceRecord = {
      id: `device-${this.devices.size + 1}`,
      playerId: player.id,
      tokenHash: input.tokenHash,
      createdAt: input.now,
      lastSeenAt: input.now
    };

    this.players.set(player.id, player);
    this.devices.set(device.id, device);

    return { player, device };
  }

  async findPlayerByDeviceTokenHash(tokenHash: string): Promise<AuthenticatedPlayerRecord | null> {
    const device = [...this.devices.values()].find((item) => item.tokenHash === tokenHash);

    if (!device) {
      return null;
    }

    const player = this.players.get(device.playerId);
    return player ? { player, device } : null;
  }

  async touchPlayerDevice(input: { playerId: string; deviceId: string; now: Date }): Promise<AuthenticatedPlayerRecord> {
    const player = this.players.get(input.playerId);
    const device = this.devices.get(input.deviceId);

    if (!player || !device) {
      throw new Error("Missing player session");
    }

    const touchedPlayer = {
      ...player,
      lastSeenAt: input.now,
      updatedAt: input.now
    };
    const touchedDevice = {
      ...device,
      lastSeenAt: input.now
    };

    this.players.set(touchedPlayer.id, touchedPlayer);
    this.devices.set(touchedDevice.id, touchedDevice);

    return { player: touchedPlayer, device: touchedDevice };
  }

  async movePlayerDevice(input: { deviceId: string; playerId: string; now: Date }): Promise<AuthenticatedPlayerRecord> {
    const player = this.players.get(input.playerId);
    const device = this.devices.get(input.deviceId);

    if (!player || !device) {
      throw new Error("Missing player session");
    }

    const movedPlayer = {
      ...player,
      lastSeenAt: input.now,
      updatedAt: input.now
    };
    const movedDevice = {
      ...device,
      playerId: input.playerId,
      lastSeenAt: input.now
    };

    this.players.set(movedPlayer.id, movedPlayer);
    this.devices.set(movedDevice.id, movedDevice);

    return { player: movedPlayer, device: movedDevice };
  }

  async findPlayerIdentity(input: {
    provider: "vk_id";
    providerUserId: string;
  }): Promise<{ identity: PlayerIdentityRecord; player: PlayerRecord } | null> {
    const identity = this.identities.get(`${input.provider}:${input.providerUserId}`);

    if (!identity) {
      return null;
    }

    const player = this.players.get(identity.playerId);
    return player ? { identity, player } : null;
  }

  async linkPlayerIdentity(input: {
    avatarUrl: string | null;
    displayName: string | null;
    playerId: string;
    provider: "vk_id";
    providerUserId: string;
    now: Date;
  }): Promise<{ identity: PlayerIdentityRecord; player: PlayerRecord }> {
    const key = `${input.provider}:${input.providerUserId}`;
    const existing = this.identities.get(key);

    if (existing && existing.playerId !== input.playerId) {
      throw new Error("Player identity already belongs to another player");
    }

    const player = this.players.get(input.playerId);

    if (!player) {
      throw new Error("Missing player");
    }

    const identity: PlayerIdentityRecord = {
      id: existing?.id ?? `identity-${this.identities.size + 1}`,
      playerId: input.playerId,
      provider: input.provider,
      providerUserId: input.providerUserId,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      createdAt: existing?.createdAt ?? input.now,
      updatedAt: input.now,
      lastSeenAt: input.now
    };
    const updatedPlayer = {
      ...player,
      ...(input.displayName ? { displayName: input.displayName } : {}),
      updatedAt: input.now,
      lastSeenAt: input.now
    };

    this.identities.set(key, identity);
    this.players.set(updatedPlayer.id, updatedPlayer);

    return { identity, player: updatedPlayer };
  }

  async findSave(playerId: string): Promise<PlayerSaveRecord | null> {
    return this.saves.get(playerId) ?? null;
  }

  async writeSave(input: {
    playerId: string;
    schemaVersion: 1;
    contentVersion: string;
    expectedRevision?: number;
    state: unknown;
    now: Date;
  }): Promise<SaveWriteResult> {
    const existing = this.saves.get(input.playerId);

    if (existing && input.expectedRevision !== undefined && input.expectedRevision !== existing.revision) {
      return {
        ok: false,
        code: "revision_conflict",
        current: existing
      };
    }

    const save: PlayerSaveRecord = {
      playerId: input.playerId,
      schemaVersion: input.schemaVersion,
      contentVersion: input.contentVersion,
      revision: existing ? existing.revision + 1 : 1,
      state: input.state,
      updatedAt: input.now
    };

    this.saves.set(input.playerId, save);
    return { ok: true, save };
  }

  async upsertScores(input: {
    playerId: string;
    scores: Array<{
      scoreKey: string;
      seasonId: string;
      value: number;
    }>;
    now: Date;
  }): Promise<PlayerScoreRecord[]> {
    return input.scores.map((score) => {
      const key = `${input.playerId}:${score.scoreKey}:${score.seasonId}`;
      const next: PlayerScoreRecord = {
        id: this.scores.get(key)?.id ?? `score-${this.scores.size + 1}`,
        playerId: input.playerId,
        scoreKey: score.scoreKey,
        seasonId: score.seasonId,
        value: score.value,
        updatedAt: input.now
      };

      this.scores.set(key, next);
      return next;
    });
  }

  async listLeaderboard(input: {
    scoreKey: string;
    seasonId: string;
    limit: number;
  }): Promise<PlayerLeaderboardEntryRecord[]> {
    return [...this.scores.values()]
      .filter((score) => score.scoreKey === input.scoreKey && score.seasonId === input.seasonId)
      .map((score) => {
        const player = this.players.get(score.playerId);

        if (!player) {
          throw new Error("Missing player for score");
        }

        return {
          playerId: score.playerId,
          displayName: player.displayName,
          scoreKey: score.scoreKey,
          seasonId: score.seasonId,
          value: score.value,
          updatedAt: score.updatedAt
        };
      })
      .sort((left, right) => {
        const byValue = right.value - left.value;

        if (byValue !== 0) {
          return byValue;
        }

        const byUpdatedAt = left.updatedAt.getTime() - right.updatedAt.getTime();
        return byUpdatedAt !== 0 ? byUpdatedAt : left.playerId.localeCompare(right.playerId);
      })
      .slice(0, input.limit);
  }
}
