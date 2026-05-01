import { describe, expect, it } from "vitest";
import {
  loadStoredBossCards,
  loadStoredGoblinRoster,
  loadStoredMiningSession,
  playerSaveStorageKey,
  readPlayerSave,
  saveStoredBossCards,
  saveStoredGoblinRoster,
  saveStoredMiningSession,
  type PlayerSaveStorage,
  type StoredGoblinRoster,
  type StoredMineSave
} from "./playerSave";

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

function createMineSave(contentVersion = "0.0.15"): StoredMineSave {
  return {
    activeCell: { row: 1, col: 2 },
    bossEnergy: { currentEnergy: 300, updatedAt: 1000 },
    builtMines: [],
    contentVersion,
    goblinPlacements: { miner_1: 2 },
    mineCompletionNoticeSeenIds: ["old_well_01"],
    platformRow: 1,
    save: {
      blocks: [{ col: 2, destroyed: false, hp: 12, row: 1 }],
      foundVeins: [{ col: 2, id: "vein_1", mineTemplateId: "old_well_01", row: 1, seed: "local-player-001", veinTypeId: "gold_vein" }],
      mineTemplateId: "old_well_01",
      resources: { gold: 600, stone: 40 },
      seed: "local-player-001"
    },
    savedAt: 1234
  };
}

function createRosterSave(contentVersion = "0.0.15"): StoredGoblinRoster {
  return {
    contentVersion,
    roster: {
      goblinLevels: { miner_1: 2 },
      hiredGoblinIds: ["miner_1", "collector_1"],
      hutLevel: 2
    }
  };
}

describe("player save", () => {
  it("writes only the stable combined player save", () => {
    const storage = createMemoryStorage();
    const mine = createMineSave();
    const roster = createRosterSave();

    saveStoredMiningSession(mine, storage);
    saveStoredGoblinRoster(roster, storage);
    saveStoredBossCards({ levels: { hit_damage: 1 } }, storage, undefined, "0.0.15");

    expect(loadStoredMiningSession(storage, "0.0.15")).toEqual(mine);
    expect(loadStoredGoblinRoster(storage, "0.0.15")).toEqual(roster);
    expect(loadStoredBossCards(storage, undefined, "0.0.15")).toEqual({ levels: { hit_damage: 1 } });
    expect(Object.keys(storage.values)).toEqual([playerSaveStorageKey]);
    expect(JSON.parse(storage.values[playerSaveStorageKey] ?? "{}")).toMatchObject({
      contentVersion: "0.0.15",
      mine,
      roster,
      bossCards: { levels: { hit_damage: 1 } },
      schemaVersion: 1
    });
  });

  it("ignores saves from older content versions", () => {
    const storage = createMemoryStorage();
    const mine = createMineSave("0.0.14");
    const roster = createRosterSave("0.0.14");

    saveStoredMiningSession(mine, storage);
    saveStoredGoblinRoster(roster, storage);
    saveStoredBossCards({ levels: { hit_damage: 3 } }, storage, undefined, "0.0.14");

    expect(readPlayerSave(storage)?.contentVersion).toBe("0.0.14");
    expect(loadStoredMiningSession(storage, "0.0.15")).toBeNull();
    expect(loadStoredGoblinRoster(storage, "0.0.15")).toBeNull();
    expect(loadStoredBossCards(storage, undefined, "0.0.15")).toEqual({ levels: {} });
  });

  it("does not migrate old split save keys", () => {
    const mine = createMineSave("0.0.14");
    const roster = createRosterSave("0.0.14");
    const storage = createMemoryStorage({
      "goblin-cartel.player.mine-save.v2": JSON.stringify(mine),
      "goblin-cartel.player.goblin-roster.v1": JSON.stringify(roster)
    });

    expect(readPlayerSave(storage)).toBeNull();
    expect(loadStoredMiningSession(storage, "0.0.14")).toBeNull();
    expect(loadStoredGoblinRoster(storage, "0.0.14")).toBeNull();
    expect(storage.values[playerSaveStorageKey]).toBeUndefined();
  });

  it("normalizes boss cards from the stable save", () => {
    const storage = createMemoryStorage({
      [playerSaveStorageKey]: JSON.stringify({
        bossCards: {
          levels: {
            hit_damage: 3,
            missing: 10
          }
        },
        contentVersion: "0.0.15",
        savedAt: 5000,
        schemaVersion: 1
      })
    });

    expect(loadStoredBossCards(storage, undefined, "0.0.15")).toEqual({
      levels: {
        hit_damage: 3
      }
    });
  });
});
