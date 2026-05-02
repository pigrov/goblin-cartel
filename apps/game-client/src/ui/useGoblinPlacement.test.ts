import { describe, expect, it } from "vitest";
import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";
import {
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

function createGoblin(
  id: string,
  options: {
    class?: GoblinConfig["class"];
    effects?: GoblinConfig["ability"]["effects"];
    leveling?: GoblinConfig["leveling"];
    sortOrder?: number;
  } = {}
): GoblinConfig {
  return {
    ability: {
      descriptionKey: `ability.${id}.description`,
      effects: options.effects ?? [],
      id: `ability_${id}`,
      nameKey: `ability.${id}.name`
    },
    assetId: `asset_${id}`,
    baseStats: {
      loyalty: 1,
      luck: 1,
      speed: 1,
      strength: 1
    },
    class: options.class ?? "miner",
    clan: "neutral",
    descriptionKey: `goblin.${id}.description`,
    hireCost: [],
    id,
    leveling: options.leveling,
    nameKey: `goblin.${id}.name`,
    rarity: "common",
    sortOrder: options.sortOrder ?? 0,
    unlockRequirements: []
  } as unknown as GoblinConfig;
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
    const first = createGoblin("first", { sortOrder: 1 });
    const second = createGoblin("second", { sortOrder: 2 });
    const third = createGoblin("third", { sortOrder: 3 });

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

  it("counts foreman offline relocation slots with level growth", () => {
    const foreman = createGoblin("foreman", {
      class: "foreman",
      effects: [
        { type: "offline_relocation_slots", value: 1 },
        { type: "offline_auto_damage_multiplier", value: 1.1 },
        { type: "offline_reward_multiplier", value: 1.05 }
      ],
      leveling: {
        autoCollectSlotsPerLevel: 0,
        buildCostMultiplierPerLevel: 0,
        buildTimeMultiplierPerLevel: 0,
        cost: [],
        maxLevel: 4,
        mineCapacityMultiplierPerLevel: 0,
        mineProductionMultiplierPerLevel: 0,
        offlineRelocationSlotsPerLevel: 1,
        statGrowthPerLevel: {
          loyalty: 0,
          luck: 0,
          speed: 0,
          strength: 0
        }
      }
    });

    expect(getGoblinOfflineRelocationSlots(foreman, 1)).toBe(1);
    expect(getGoblinOfflineRelocationSlots(foreman, 3)).toBe(3);
    expect(getGoblinOfflineAutoDamageMultiplier(foreman, 3)).toBe(1.1);
    expect(getGoblinOfflineRewardMultiplier(foreman, 3)).toBe(1.05);
  });

  it("moves idle miners to live platform columns during offline mining", () => {
    const session = createSession();
    const first = createGoblin("first", { sortOrder: 1 });
    const second = createGoblin("second", { sortOrder: 2 });
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
