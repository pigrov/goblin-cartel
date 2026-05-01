import { describe, expect, it } from "vitest";
import {
  legacyGoblinRosterStorageKey,
  legacyMineSaveStorageKey,
  loadStoredGoblinRoster,
  loadStoredMiningSession,
  playerSaveStorageKey,
  readPlayerSave,
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

function createMineSave(contentVersion = "0.0.14"): StoredMineSave {
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

function createRosterSave(contentVersion = "0.0.14"): StoredGoblinRoster {
  return {
    contentVersion,
    roster: {
      goblinLevels: { miner_1: 2 },
      hiredGoblinIds: ["miner_1", "collector_1"],
      hutLevel: 2
    }
  };
}

describe("player save migration", () => {
  it("writes a combined player save while keeping legacy keys readable", () => {
    const storage = createMemoryStorage();
    const mine = createMineSave();
    const roster = createRosterSave();

    saveStoredMiningSession(mine, storage);
    saveStoredGoblinRoster(roster, storage);

    expect(loadStoredMiningSession(storage)).toEqual(mine);
    expect(loadStoredGoblinRoster(storage)).toEqual(roster);
    expect(JSON.parse(storage.values[legacyMineSaveStorageKey] ?? "{}")).toMatchObject({ contentVersion: "0.0.14" });
    expect(JSON.parse(storage.values[legacyGoblinRosterStorageKey] ?? "{}")).toMatchObject({ contentVersion: "0.0.14" });
    expect(JSON.parse(storage.values[playerSaveStorageKey] ?? "{}")).toMatchObject({
      mine,
      roster,
      schemaVersion: 1
    });
  });

  it("migrates old split saves into the stable player save key", () => {
    const mine = createMineSave("0.0.13");
    const roster = createRosterSave("0.0.13");
    const storage = createMemoryStorage({
      [legacyMineSaveStorageKey]: JSON.stringify(mine),
      [legacyGoblinRosterStorageKey]: JSON.stringify(roster)
    });

    expect(readPlayerSave(storage)).toMatchObject({
      contentVersion: "0.0.13",
      mine,
      roster,
      schemaVersion: 1
    });
    expect(loadStoredMiningSession(storage)).toEqual(mine);
    expect(loadStoredGoblinRoster(storage)).toEqual(roster);
    expect(JSON.parse(storage.values[playerSaveStorageKey] ?? "{}")).toMatchObject({ mine, roster, schemaVersion: 1 });
  });

  it("does not reject progress only because content version changed", () => {
    const storage = createMemoryStorage();
    const mine = createMineSave("0.0.13");
    const roster = createRosterSave("0.0.13");

    saveStoredMiningSession(mine, storage);
    saveStoredGoblinRoster(roster, storage);

    expect(loadStoredMiningSession(storage)?.contentVersion).toBe("0.0.13");
    expect(loadStoredMiningSession(storage)?.save.resources).toEqual({ gold: 600, stone: 40 });
    expect(loadStoredGoblinRoster(storage)?.roster).toEqual({
      goblinLevels: { miner_1: 2 },
      hiredGoblinIds: ["miner_1", "collector_1"],
      hutLevel: 2
    });
  });
});
