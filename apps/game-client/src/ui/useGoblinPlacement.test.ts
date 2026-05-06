import { describe, expect, it } from "vitest";
import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import type { GoblinRosterState, MiningSession } from "@goblin-cartel/game-core";
import {
  assignGoblinWorkers,
  createDefaultGoblinPlacements,
  findPlatformCells,
  getGoblinOfflineAutoDamageMultiplier,
  getGoblinOfflineRelocationSlots,
  getGoblinOfflineRewardMultiplier,
  getGoblinPlacementStatus,
  normalizeGoblinPlacements,
  placeGoblinInFirstFreeColumn,
  relocateOfflineGoblinPlacements
} from "./useGoblinPlacement";
import { createRuntimeGoblinConfigs } from "./goblinRuntimeUnits";

function createSession(): MiningSession {
  return {
    blocks: [
      [
        { col: 0, destroyed: true, row: 0 },
        { col: 1, destroyed: false, hp: 12, row: 0 },
        { col: 2, destroyed: true, row: 0 }
      ]
    ],
    mine: {
      depthMeters: 1,
      height: 1,
      seed: "test",
      templateId: "test_mine",
      width: 3
    }
  } as unknown as MiningSession;
}

describe("goblin placement", () => {
  it("keeps destroyed cells as valid platform seats", () => {
    expect(findPlatformCells(createSession(), 0)).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 }
    ]);
  });

  it("prefers live blocks for default placement and falls back to empty seats", () => {
    const session = createSession();

    expect(placeGoblinInFirstFreeColumn(session, {}, "first", 0)).toEqual({
      first: 1
    });
    expect(placeGoblinInFirstFreeColumn(session, { first: 1 }, "second", 0)).toEqual({
      first: 1,
      second: 0
    });
  });

  it("limits default and normalized placements by platform slots", () => {
    const session = createSession();
    const first = createGoblin("miner", "power", { id: "first", sortOrder: 1 });
    const second = createGoblin("miner", "power", { id: "second", sortOrder: 2 });
    const third = createGoblin("miner", "power", { id: "third", sortOrder: 3 });

    expect(createDefaultGoblinPlacements(session, [first, second, third], 0, 2)).toEqual({
      first: 1,
      second: 0
    });
    expect(
      normalizeGoblinPlacements(
        session,
        [first, second, third],
        {
          first: 1,
          second: 0,
          third: 2
        },
        {
          maxPlacements: 2,
          placeMissing: true,
          platformRow: 0
        }
      )
    ).toEqual({
      first: 1,
      second: 0
    });
    expect(placeGoblinInFirstFreeColumn(session, { first: 1, second: 0 }, "third", 0, { maxPlacements: 2 })).toEqual({
      first: 1,
      second: 0
    });
  });

  it("reports platform goblin status from the block below", () => {
    const session = createSession();

    expect(getGoblinPlacementStatus(session, 1, 0, true)).toBe("working");
    expect(getGoblinPlacementStatus(session, 1, 0, false)).toBe("idle");
    expect(getGoblinPlacementStatus(session, 0, 0, false)).toBe("waiting");
  });

  it("uses hired miner instance id and power stat for worker damage", () => {
    const session = createSession();
    const miner = createGoblin("miner", "power", { statBase: 12 });
    const roster: GoblinRosterState = {
      hiredGoblinIds: ["goblin:miner:1"],
      instances: [
        {
          equipment: [],
          goblinId: "miner",
          id: "goblin:miner:1",
          level: 1,
          lifetimeStats: {},
          role: "miner",
          stars: 5
        }
      ]
    };
    const runtimeGoblins = createRuntimeGoblinConfigs([miner], roster);

    expect(runtimeGoblins[0]).toMatchObject({
      id: "goblin:miner:1",
      sourceGoblinId: "miner"
    });
    expect(assignGoblinWorkers(session, runtimeGoblins, { "goblin:miner:1": 1 }, 0, roster)).toMatchObject([
      {
        damagePerSecond: 17,
        goblin: {
          id: "goblin:miner:1"
        },
        targetCell: {
          col: 1,
          row: 0
        }
      }
    ]);
  });

  it("counts foreman offline relocation slots and modifiers from progression tiers", () => {
    const foreman = createGoblin("foreman", "control", {
      modifiers: [
        { type: "offline_auto_damage_multiplier", value: 1.1 },
        { type: "offline_reward_multiplier", value: 1.05 }
      ],
      statBase: 5
    });

    expect(getGoblinOfflineRelocationSlots(foreman, 1)).toBe(5);
    expect(getGoblinOfflineRelocationSlots(foreman, 2)).toBe(10);
    expect(getGoblinOfflineAutoDamageMultiplier(foreman, 1)).toBe(1.1);
    expect(getGoblinOfflineRewardMultiplier(foreman, 1)).toBe(1.05);
  });

  it("moves idle miners to live platform columns during offline mining", () => {
    const session = createSession();
    const first = createGoblin("miner", "power", { id: "first", sortOrder: 1 });
    const second = createGoblin("miner", "power", { id: "second", sortOrder: 2 });
    const result = relocateOfflineGoblinPlacements(
      session,
      [first, second],
      { first: 0, second: 2 },
      0,
      { hiredGoblinIds: ["first", "second"] },
      1
    );

    expect(result.moves).toBe(1);
    expect(result.placements).toEqual({
      first: 1,
      second: 2
    });
  });
});

function createGoblin(
  role: "miner" | "collector" | "foreman",
  statKey: "power" | "speed" | "control",
  options: {
    id?: string;
    modifiers?: GoblinConfig["levels"][number]["stars"][number]["modifiers"];
    sortOrder?: number;
    statBase?: number;
  } = {}
): GoblinConfig {
  const id = options.id ?? role;
  const statBase = options.statBase ?? 5;

  return {
    assetId: `asset_${id}`,
    descriptionKey: `goblin.${id}.description`,
    hireCost: [],
    id,
    levels: [1, 2].map((level) => ({
      level,
      stars: [0, 1, 2, 3, 4, 5].map((stars) => ({
        modifiers: options.modifiers ?? [],
        stars: stars as 0 | 1 | 2 | 3 | 4 | 5,
        statValue: statBase * level + stars,
        upgradeCost: []
      }))
    })),
    nameKey: `goblin.${id}.name`,
    role,
    sortOrder: options.sortOrder ?? 0,
    statKey,
    statNameKey: `goblin.stat.${statKey}`,
    unlockRequirements: []
  };
}
