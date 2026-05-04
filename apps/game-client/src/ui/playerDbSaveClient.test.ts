import { describe, expect, it } from "vitest";
import {
  bootstrapPlayerDbSave,
  fetchPlayerDbLeaderboard,
  linkPlayerVkIdentity,
  playerDeviceTokenStorageKey,
  playerServerSaveRevisionStorageKey,
  uploadPlayerDbScores,
  uploadStoredPlayerDbSave
} from "./playerDbSaveClient";
import { playerSaveStorageKey, type PlayerSaveStorage, type StoredPlayerSaveV1 } from "./playerSave";

function createMemoryStorage(initial: Record<string, string> = {}): PlayerSaveStorage & { values: Record<string, string> } {
  const values = { ...initial };

  return {
    values,
    getItem: (key) => values[key] ?? null,
    removeItem: (key) => {
      delete values[key];
    },
    setItem: (key, value) => {
      values[key] = value;
    }
  };
}

function createSave(contentVersion = "0.0.18"): StoredPlayerSaveV1 {
  return {
    bossCards: { levels: { hit_damage: 2 } },
    contentVersion,
    roster: {
      contentVersion,
      roster: {
        hiredGoblinIds: ["miner_1"]
      }
    },
    savedAt: 1000,
    schemaVersion: 1
  };
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body
  } as Response;
}

describe("player db save client", () => {
  it("stores issued token and applies matching server save", async () => {
    const storage = createMemoryStorage();
    const save = createSave();
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = async (url: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(url), init: init ?? {} });
      return jsonResponse({
        player: { id: "player-1", displayName: null, createdAt: "", updatedAt: "", lastSeenAt: "" },
        device: { id: "device-1", createdAt: "", lastSeenAt: "" },
        token: "token-1",
        save: {
          schemaVersion: 1,
          contentVersion: "0.0.18",
          revision: 7,
          state: save,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      });
    };

    const result = await bootstrapPlayerDbSave({
      contentVersion: "0.0.18",
      fetchImpl: fetchImpl as typeof fetch,
      storage
    });

    expect(result).toEqual({
      ok: true,
      appliedServerSave: true,
      issuedToken: true,
      serverRevision: 7
    });
    expect(storage.values[playerDeviceTokenStorageKey]).toBe("token-1");
    expect(storage.values[playerServerSaveRevisionStorageKey]).toBe("7");
    expect(JSON.parse(storage.values[playerSaveStorageKey] ?? "{}")).toMatchObject({
      contentVersion: "0.0.18",
      bossCards: { levels: { hit_damage: 2 } }
    });
    expect(requests[0]).toMatchObject({
      url: "/api/player/bootstrap"
    });
  });

  it("keeps local save when server save belongs to another content version", async () => {
    const localSave = createSave("0.0.18");
    const storage = createMemoryStorage({
      [playerSaveStorageKey]: JSON.stringify(localSave)
    });
    const fetchImpl = async () =>
      jsonResponse({
        player: { id: "player-1", displayName: null, createdAt: "", updatedAt: "", lastSeenAt: "" },
        device: { id: "device-1", createdAt: "", lastSeenAt: "" },
        save: {
          schemaVersion: 1,
          contentVersion: "0.0.17",
          revision: 4,
          state: createSave("0.0.17"),
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      });

    const result = await bootstrapPlayerDbSave({
      contentVersion: "0.0.18",
      fetchImpl: fetchImpl as typeof fetch,
      storage
    });

    expect(result).toMatchObject({
      ok: true,
      appliedServerSave: false,
      serverRevision: 4
    });
    expect(JSON.parse(storage.values[playerSaveStorageKey] ?? "{}")).toMatchObject({
      contentVersion: "0.0.18"
    });
    expect(storage.values[playerServerSaveRevisionStorageKey]).toBeUndefined();
  });

  it("uploads current local save with expected revision", async () => {
    const save = createSave();
    const storage = createMemoryStorage({
      [playerDeviceTokenStorageKey]: "token-1",
      [playerServerSaveRevisionStorageKey]: "7",
      [playerSaveStorageKey]: JSON.stringify(save)
    });
    let requestBody: unknown = null;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body ?? "{}"));
      return jsonResponse({
        save: {
          schemaVersion: 1,
          contentVersion: "0.0.18",
          revision: 8,
          state: save,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      });
    };

    const result = await uploadStoredPlayerDbSave({
      contentVersion: "0.0.18",
      fetchImpl: fetchImpl as typeof fetch,
      storage
    });

    expect(result).toEqual({
      ok: true,
      uploaded: true,
      revision: 8,
      conflictResolved: false
    });
    expect(requestBody).toMatchObject({
      schemaVersion: 1,
      contentVersion: "0.0.18",
      expectedRevision: 7,
      state: {
        contentVersion: "0.0.18"
      }
    });
    expect(storage.values[playerServerSaveRevisionStorageKey]).toBe("8");
  });

  it("does not upload without a player token", async () => {
    const storage = createMemoryStorage({
      [playerSaveStorageKey]: JSON.stringify(createSave())
    });

    await expect(
      uploadStoredPlayerDbSave({
        contentVersion: "0.0.18",
        fetchImpl: (async () => {
          throw new Error("fetch should not be called");
        }) as typeof fetch,
        storage
      })
    ).resolves.toEqual({
      ok: true,
      uploaded: false,
      reason: "no_token"
    });
  });

  it("resolves revision conflict by retrying local save against current server revision", async () => {
    const save = createSave();
    const storage = createMemoryStorage({
      [playerDeviceTokenStorageKey]: "token-1",
      [playerServerSaveRevisionStorageKey]: "7",
      [playerSaveStorageKey]: JSON.stringify(save)
    });
    const requestBodies: unknown[] = [];
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body ?? "{}")));

      if (requestBodies.length === 1) {
        return jsonResponse(
          {
            error: "revision_conflict",
            current: {
              schemaVersion: 1,
              contentVersion: "0.0.18",
              revision: 9,
              state: createSave(),
              updatedAt: "2026-05-03T10:00:00.000Z"
            }
          },
          { ok: false, status: 409 }
        );
      }

      return jsonResponse({
        save: {
          schemaVersion: 1,
          contentVersion: "0.0.18",
          revision: 10,
          state: save,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      });
    };

    const result = await uploadStoredPlayerDbSave({
      contentVersion: "0.0.18",
      fetchImpl: fetchImpl as typeof fetch,
      storage
    });

    expect(result).toEqual({
      ok: true,
      uploaded: true,
      revision: 10,
      conflictResolved: true
    });
    expect(requestBodies).toMatchObject([{ expectedRevision: 7 }, { expectedRevision: 9 }]);
    expect(storage.values[playerServerSaveRevisionStorageKey]).toBe("10");
    expect(JSON.parse(storage.values[playerSaveStorageKey] ?? "{}")).toMatchObject({
      contentVersion: "0.0.18"
    });
  });

  it("uploads normalized score rows", async () => {
    const storage = createMemoryStorage({
      [playerDeviceTokenStorageKey]: "token-1"
    });
    let requestBody: unknown = null;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body ?? "{}"));
      return jsonResponse({
        scores: []
      });
    };

    const result = await uploadPlayerDbScores({
      fetchImpl: fetchImpl as typeof fetch,
      scores: [
        { key: "mine.max_depth_meters", value: 12.7 },
        { key: "mine.max_depth_meters", value: 14 },
        { key: "bad", value: Number.NaN },
        { key: "built_mines.total_count", seasonId: " global ", value: 2 }
      ],
      storage
    });

    expect(result).toEqual({
      ok: true,
      uploaded: true,
      scoreCount: 2
    });
    expect(requestBody).toEqual({
      scores: [
        {
          key: "mine.max_depth_meters",
          seasonId: "global",
          value: 14
        },
        {
          key: "built_mines.total_count",
          seasonId: "global",
          value: 2
        }
      ]
    });
  });

  it("loads public leaderboard rows", async () => {
    let requestedUrl = "";
    const fetchImpl = async (url: RequestInfo | URL) => {
      requestedUrl = String(url);
      return jsonResponse({
        leaderboard: [
          {
            rank: 1,
            playerId: "player-1",
            displayName: "Крикк",
            key: "mine.max_depth_meters",
            seasonId: "global",
            value: 14,
            updatedAt: "2026-05-03T10:00:00.000Z"
          }
        ]
      });
    };

    const result = await fetchPlayerDbLeaderboard({
      fetchImpl: fetchImpl as typeof fetch,
      limit: 20,
      scoreKey: " mine.max_depth_meters "
    });

    expect(requestedUrl).toBe("/api/player/leaderboard/mine.max_depth_meters?limit=20");
    expect(result).toEqual({
      ok: true,
      leaderboard: [
        {
          rank: 1,
          playerId: "player-1",
          displayName: "Крикк",
          key: "mine.max_depth_meters",
          seasonId: "global",
          value: 14,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      ]
    });
  });

  it("links VK ID and applies existing server save for restored player", async () => {
    const storage = createMemoryStorage({
      [playerDeviceTokenStorageKey]: "token-1"
    });
    const save = createSave();
    let requestBody: unknown = null;
    const fetchImpl = async (_url: RequestInfo | URL, init?: RequestInit) => {
      requestBody = JSON.parse(String(init?.body ?? "{}"));
      return jsonResponse({
        ok: true,
        linkedExistingPlayer: true,
        player: {
          id: "player-1",
          displayName: "Крикк",
          createdAt: "",
          updatedAt: "",
          lastSeenAt: ""
        },
        identity: {
          provider: "vk_id",
          providerUserId: "vk-user-1",
          displayName: "Крикк",
          avatarUrl: null,
          linkedAt: "2026-05-03T10:00:00.000Z",
          lastSeenAt: "2026-05-03T10:00:00.000Z"
        },
        save: {
          schemaVersion: 1,
          contentVersion: "0.0.18",
          revision: 11,
          state: save,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      });
    };

    const result = await linkPlayerVkIdentity({
      contentVersion: "0.0.18",
      fetchImpl: fetchImpl as typeof fetch,
      proof: {
        accessToken: "verified-token"
      },
      storage
    });

    expect(result).toEqual({
      ok: true,
      appliedServerSave: true,
      displayName: "Крикк",
      linkedExistingPlayer: true,
      providerUserId: "vk-user-1",
      serverRevision: 11
    });
    expect(requestBody).toEqual({
      accessToken: "verified-token"
    });
    expect(storage.values[playerServerSaveRevisionStorageKey]).toBe("11");
    expect(JSON.parse(storage.values[playerSaveStorageKey] ?? "{}")).toMatchObject({
      contentVersion: "0.0.18"
    });
  });
});
