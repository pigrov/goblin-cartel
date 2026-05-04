import { and, asc, desc, eq } from "drizzle-orm";
import type { createDb } from "../db/client.js";
import { playerDevices, playerIdentities, playerSaves, playerScores, players } from "../db/schema.js";
import type { AuthenticatedPlayerRecord, PlayerSaveStore, SaveWriteResult } from "./player-save.js";

type AppDb = ReturnType<typeof createDb>;

export class DrizzlePlayerSaveStore implements PlayerSaveStore {
  constructor(private readonly db: AppDb) {}

  async createPlayerWithDevice(input: {
    displayName: string | null;
    tokenHash: string;
    now: Date;
  }): Promise<AuthenticatedPlayerRecord> {
    return this.db.transaction(async (tx) => {
      const [player] = await tx
        .insert(players)
        .values({
          displayName: input.displayName,
          createdAt: input.now,
          updatedAt: input.now,
          lastSeenAt: input.now
        })
        .returning();

      if (!player) {
        throw new Error("Failed to create player");
      }

      const [device] = await tx
        .insert(playerDevices)
        .values({
          playerId: player.id,
          tokenHash: input.tokenHash,
          createdAt: input.now,
          lastSeenAt: input.now
        })
        .returning();

      if (!device) {
        throw new Error("Failed to create player device");
      }

      return { player, device };
    });
  }

  async findPlayerByDeviceTokenHash(tokenHash: string): Promise<AuthenticatedPlayerRecord | null> {
    const [row] = await this.db
      .select({
        device: playerDevices,
        player: players
      })
      .from(playerDevices)
      .innerJoin(players, eq(playerDevices.playerId, players.id))
      .where(eq(playerDevices.tokenHash, tokenHash))
      .limit(1);

    return row ?? null;
  }

  async touchPlayerDevice(input: { playerId: string; deviceId: string; now: Date }): Promise<AuthenticatedPlayerRecord> {
    return this.db.transaction(async (tx) => {
      const [player] = await tx
        .update(players)
        .set({
          lastSeenAt: input.now,
          updatedAt: input.now
        })
        .where(eq(players.id, input.playerId))
        .returning();

      const [device] = await tx
        .update(playerDevices)
        .set({
          lastSeenAt: input.now
        })
        .where(eq(playerDevices.id, input.deviceId))
        .returning();

      if (!player || !device) {
        throw new Error("Failed to touch player session");
      }

      return { player, device };
    });
  }

  async movePlayerDevice(input: { deviceId: string; playerId: string; now: Date }): Promise<AuthenticatedPlayerRecord> {
    return this.db.transaction(async (tx) => {
      const [player] = await tx
        .update(players)
        .set({
          lastSeenAt: input.now,
          updatedAt: input.now
        })
        .where(eq(players.id, input.playerId))
        .returning();

      const [device] = await tx
        .update(playerDevices)
        .set({
          playerId: input.playerId,
          lastSeenAt: input.now
        })
        .where(eq(playerDevices.id, input.deviceId))
        .returning();

      if (!player || !device) {
        throw new Error("Failed to move player device");
      }

      return { player, device };
    });
  }

  async findPlayerIdentity(input: { provider: "vk_id"; providerUserId: string }) {
    const [row] = await this.db
      .select({
        identity: playerIdentities,
        player: players
      })
      .from(playerIdentities)
      .innerJoin(players, eq(playerIdentities.playerId, players.id))
      .where(and(eq(playerIdentities.provider, input.provider), eq(playerIdentities.providerUserId, input.providerUserId)))
      .limit(1);

    return row ?? null;
  }

  async linkPlayerIdentity(input: {
    avatarUrl: string | null;
    displayName: string | null;
    playerId: string;
    provider: "vk_id";
    providerUserId: string;
    now: Date;
  }) {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(playerIdentities)
        .where(and(eq(playerIdentities.provider, input.provider), eq(playerIdentities.providerUserId, input.providerUserId)))
        .limit(1);

      if (existing && existing.playerId !== input.playerId) {
        throw new Error("Player identity already belongs to another player");
      }

      const values = {
        avatarUrl: input.avatarUrl,
        displayName: input.displayName,
        lastSeenAt: input.now,
        updatedAt: input.now
      };

      const [identity] = existing
        ? await tx.update(playerIdentities).set(values).where(eq(playerIdentities.id, existing.id)).returning()
        : await tx
            .insert(playerIdentities)
            .values({
              playerId: input.playerId,
              provider: input.provider,
              providerUserId: input.providerUserId,
              createdAt: input.now,
              ...values
            })
            .returning();

      const [player] = await tx
        .update(players)
        .set({
          ...(input.displayName ? { displayName: input.displayName } : {}),
          lastSeenAt: input.now,
          updatedAt: input.now
        })
        .where(eq(players.id, input.playerId))
        .returning();

      if (!identity || !player) {
        throw new Error("Failed to link player identity");
      }

      return { identity, player };
    });
  }

  async findSave(playerId: string) {
    const [save] = await this.db.select().from(playerSaves).where(eq(playerSaves.playerId, playerId)).limit(1);
    return save ?? null;
  }

  async writeSave(input: {
    playerId: string;
    schemaVersion: 1;
    contentVersion: string;
    expectedRevision?: number;
    state: unknown;
    now: Date;
  }): Promise<SaveWriteResult> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(playerSaves).where(eq(playerSaves.playerId, input.playerId)).limit(1);

      if (existing && input.expectedRevision !== undefined && existing.revision !== input.expectedRevision) {
        return {
          ok: false,
          code: "revision_conflict",
          current: existing
        };
      }

      const revision = existing ? existing.revision + 1 : 1;
      const values = {
        contentVersion: input.contentVersion,
        revision,
        schemaVersion: input.schemaVersion,
        state: input.state,
        updatedAt: input.now
      };

      const [save] = existing
        ? await tx.update(playerSaves).set(values).where(eq(playerSaves.playerId, input.playerId)).returning()
        : await tx
            .insert(playerSaves)
            .values({
              playerId: input.playerId,
              ...values
            })
            .returning();

      if (!save) {
        throw new Error("Failed to write player save");
      }

      return {
        ok: true,
        save
      };
    });
  }

  async upsertScores(input: {
    playerId: string;
    scores: Array<{
      scoreKey: string;
      seasonId: string;
      value: number;
    }>;
    now: Date;
  }) {
    if (input.scores.length === 0) {
      return [];
    }

    return this.db.transaction(async (tx) => {
      const rows = [];

      for (const score of input.scores) {
        const [row] = await tx
          .insert(playerScores)
          .values({
            playerId: input.playerId,
            scoreKey: score.scoreKey,
            seasonId: score.seasonId,
            value: score.value,
            updatedAt: input.now
          })
          .onConflictDoUpdate({
            target: [playerScores.playerId, playerScores.scoreKey, playerScores.seasonId],
            set: {
              value: score.value,
              updatedAt: input.now
            }
          })
          .returning();

        if (row) {
          rows.push(row);
        }
      }

      await tx
        .update(players)
        .set({
          updatedAt: input.now,
          lastSeenAt: input.now
        })
        .where(eq(players.id, input.playerId));

      return rows;
    });
  }

  async listLeaderboard(input: { scoreKey: string; seasonId: string; limit: number }) {
    return this.db
      .select({
        playerId: playerScores.playerId,
        displayName: players.displayName,
        scoreKey: playerScores.scoreKey,
        seasonId: playerScores.seasonId,
        value: playerScores.value,
        updatedAt: playerScores.updatedAt
      })
      .from(playerScores)
      .innerJoin(players, eq(playerScores.playerId, players.id))
      .where(and(eq(playerScores.scoreKey, input.scoreKey), eq(playerScores.seasonId, input.seasonId)))
      .orderBy(desc(playerScores.value), asc(playerScores.updatedAt), asc(playerScores.playerId))
      .limit(input.limit);
  }
}
