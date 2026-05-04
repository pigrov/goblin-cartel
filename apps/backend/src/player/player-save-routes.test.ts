import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { PlayerSaveService } from "./player-save.js";
import { registerPlayerSaveRoutes } from "./player-save-routes.js";

const publicPlayer = {
  id: "player-1",
  displayName: null,
  createdAt: "2026-05-03T10:00:00.000Z",
  updatedAt: "2026-05-03T10:00:00.000Z",
  lastSeenAt: "2026-05-03T10:00:00.000Z"
};

const publicDevice = {
  id: "device-1",
  createdAt: "2026-05-03T10:00:00.000Z",
  lastSeenAt: "2026-05-03T10:00:00.000Z"
};

describe("player save routes", () => {
  it("bootstraps an anonymous player device", async () => {
    const server = Fastify({ logger: false });
    await registerPlayerSaveRoutes(server, createPlayerSaveService());

    const response = await server.inject({
      method: "POST",
      url: "/player/bootstrap",
      payload: {
        displayName: "Крикк"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      player: {
        id: "player-1"
      },
      device: {
        id: "device-1"
      },
      token: "issued-token",
      save: null
    });
  });

  it("requires a valid player token before returning a save", async () => {
    const server = Fastify({ logger: false });
    await registerPlayerSaveRoutes(server, createPlayerSaveService());

    const response = await server.inject({
      method: "GET",
      url: "/player/save"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "invalid_player_session" });
  });

  it("writes save snapshots for a valid player token", async () => {
    const server = Fastify({ logger: false });
    await registerPlayerSaveRoutes(server, createPlayerSaveService());

    const response = await server.inject({
      method: "PUT",
      url: "/player/save",
      headers: {
        authorization: "Bearer token"
      },
      payload: {
        schemaVersion: 1,
        contentVersion: "0.0.18",
        state: {
          resources: {
            gold: 600
          }
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      save: {
        contentVersion: "0.0.18",
        revision: 2
      }
    });
  });

  it("returns conflicts for stale save revisions", async () => {
    const server = Fastify({ logger: false });
    await registerPlayerSaveRoutes(server, createPlayerSaveService());

    const response = await server.inject({
      method: "PUT",
      url: "/player/save",
      headers: {
        authorization: "Bearer token"
      },
      payload: {
        schemaVersion: 1,
        contentVersion: "0.0.18",
        expectedRevision: 0,
        state: {
          resources: {
            gold: 600
          }
        }
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: "revision_conflict",
      current: {
        revision: 1
      }
    });
  });

  it("upserts scores for future leaderboard rows", async () => {
    const server = Fastify({ logger: false });
    await registerPlayerSaveRoutes(server, createPlayerSaveService());

    const response = await server.inject({
      method: "PUT",
      url: "/player/scores",
      headers: {
        authorization: "Bearer token"
      },
      payload: {
        scores: [{ key: "mine_depth", value: 10 }]
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      scores: [
        {
          key: "mine_depth",
          seasonId: "global",
          value: 10,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      ]
    });
  });

  it("links a valid VK ID identity to the player session", async () => {
    const server = Fastify({ logger: false });
    await registerPlayerSaveRoutes(server, createPlayerSaveService());

    const response = await server.inject({
      method: "POST",
      url: "/player/link/vk-id",
      headers: {
        authorization: "Bearer token"
      },
      payload: {
        accessToken: "verified-token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      linkedExistingPlayer: false,
      player: {
        id: "player-1",
        displayName: "Крикк"
      },
      identity: {
        provider: "vk_id",
        providerUserId: "vk-user-1",
        displayName: "Крикк"
      }
    });
  });

  it("requires a player session before linking VK ID", async () => {
    const server = Fastify({ logger: false });
    await registerPlayerSaveRoutes(server, createPlayerSaveService());

    const response = await server.inject({
      method: "POST",
      url: "/player/link/vk-id",
      payload: {
        accessToken: "verified-token"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "invalid_player_session" });
  });

  it("returns public leaderboard rows by score key", async () => {
    const server = Fastify({ logger: false });
    await registerPlayerSaveRoutes(server, createPlayerSaveService());

    const response = await server.inject({
      method: "GET",
      url: "/player/leaderboard/mine_depth?limit=2"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      leaderboard: [
        {
          rank: 1,
          playerId: "player-1",
          displayName: null,
          key: "mine_depth",
          seasonId: "global",
          value: 14,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      ]
    });
  });
});

function createPlayerSaveService(): PlayerSaveService {
  return {
    async bootstrap(input) {
      if (input.token === "token") {
        return {
          ok: true,
          value: {
            player: publicPlayer,
            device: publicDevice,
            save: null
          }
        };
      }

      return {
        ok: true,
        value: {
          player: {
            ...publicPlayer,
            displayName: input.displayName ?? null
          },
          device: publicDevice,
          save: null,
          token: "issued-token"
        }
      };
    },
    async getSave(token) {
      if (token !== "token") {
        return { ok: false, code: "invalid_player_session" };
      }

      return {
        ok: true,
        save: {
          schemaVersion: 1,
          contentVersion: "0.0.18",
          revision: 1,
          state: {
            resources: {
              gold: 600
            }
          },
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      };
    },
    async writeSave(token, input) {
      if (token !== "token") {
        return { ok: false, code: "invalid_player_session" };
      }

      if (input.expectedRevision === 0) {
        return {
          ok: false,
          code: "revision_conflict",
          current: {
            schemaVersion: 1,
            contentVersion: "0.0.18",
            revision: 1,
            state: {},
            updatedAt: "2026-05-03T10:00:00.000Z"
          }
        };
      }

      return {
        ok: true,
        save: {
          schemaVersion: 1,
          contentVersion: input.contentVersion,
          revision: 2,
          state: input.state,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }
      };
    },
    async upsertScores(token, input) {
      if (token !== "token") {
        return { ok: false, code: "invalid_player_session" };
      }

      return {
        ok: true,
        scores: input.scores.map((score) => ({
          key: score.key,
          seasonId: score.seasonId ?? "global",
          value: score.value,
          updatedAt: "2026-05-03T10:00:00.000Z"
        }))
      };
    },
    async linkVkIdentity(token) {
      if (token !== "token") {
        return { ok: false, code: "invalid_player_session" };
      }

      return {
        ok: true,
        device: publicDevice,
        identity: {
          provider: "vk_id",
          providerUserId: "vk-user-1",
          displayName: "Крикк",
          avatarUrl: null,
          linkedAt: "2026-05-03T10:00:00.000Z",
          lastSeenAt: "2026-05-03T10:00:00.000Z"
        },
        linkedExistingPlayer: false,
        player: {
          ...publicPlayer,
          displayName: "Крикк"
        },
        save: null
      };
    },
    async listLeaderboard(input) {
      return {
        leaderboard: [
          {
            rank: 1,
            playerId: "player-1",
            displayName: null,
            key: input.scoreKey,
            seasonId: input.seasonId ?? "global",
            value: 14,
            updatedAt: "2026-05-03T10:00:00.000Z"
          }
        ]
      };
    }
  };
}
