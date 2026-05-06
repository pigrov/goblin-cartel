import { describe, expect, it } from "vitest";
import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import type { BuiltMineState } from "@goblin-cartel/game-core";
import { findAssignableCollector, getGoblinAutoCollectSlots, hasCollectorSlotAvailable } from "./builtMineClientState";

describe("built mine goblin helpers", () => {
  it("gives collector one automation slot when its speed stat is active", () => {
    expect(getGoblinAutoCollectSlots(createGoblin("collector", "speed"), 1)).toBe(1);
    expect(getGoblinAutoCollectSlots(createGoblin("miner", "power"), 1)).toBe(0);
  });

  it("finds only collectors with a free automation slot", () => {
    const collector = createGoblin("collector", "speed");
    const occupiedMine = createMine("mine_a", collector.id);
    const targetMine = createMine("mine_b", null);

    expect(hasCollectorSlotAvailable(collector, [occupiedMine, targetMine], targetMine.id)).toBe(false);
    expect(findAssignableCollector([collector], [targetMine], targetMine.id)).toBe(collector);
  });
});

function createGoblin(role: "miner" | "collector" | "foreman", statKey: "power" | "speed" | "control"): GoblinConfig {
  return {
    assetId: `asset_${role}`,
    descriptionKey: `goblin.${role}.description`,
    hireCost: [],
    id: role,
    levels: [
      {
        level: 1,
        stars: [0, 1, 2, 3, 4, 5].map((stars) => ({
          modifiers: [],
          stars: stars as 0 | 1 | 2 | 3 | 4 | 5,
          statValue: 5 + stars,
          upgradeCost: []
        }))
      }
    ],
    nameKey: `goblin.${role}.name`,
    role,
    sortOrder: 1,
    statKey,
    statNameKey: `goblin.stat.${statKey}`,
    unlockRequirements: []
  };
}

function createMine(id: string, assignedCollectorGoblinId: string | null): BuiltMineState {
  return {
    assignedCollectorGoblinId,
    capacity: 100,
    completesAt: 0,
    id,
    lastProducedAt: 0,
    level: 1,
    productionPerHour: 10,
    productionResourceId: "gold",
    sourceVeinId: "vein_1",
    sourceVeinType: "gold_vein",
    startedAt: 0,
    status: "active",
    storedAmount: 0,
    typeId: "small_gold"
  };
}
