import { describe, expect, it } from "vitest";
import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import type { GoblinRosterState } from "@goblin-cartel/game-core";
import { assignForemanToTowerSlot, getAssignedForemen, normalizeForemanAssignments } from "./foremanTowerState";

describe("foreman tower state", () => {
  it("keeps only hired foremen and removes duplicates", () => {
    const foreman = createGoblin("goblin:foreman:1", "foreman", "control");
    const miner = createGoblin("goblin:miner:1", "miner", "power");
    const roster: GoblinRosterState = {
      hiredGoblinIds: [foreman.id, miner.id],
      instances: [
        { equipment: [], goblinId: "foreman", id: foreman.id, level: 1, lifetimeStats: {}, role: "foreman", stars: 0 },
        { equipment: [], goblinId: "miner", id: miner.id, level: 1, lifetimeStats: {}, role: "miner", stars: 0 }
      ]
    };

    expect(normalizeForemanAssignments([foreman.id, foreman.id, miner.id], [foreman, miner], roster)).toEqual([foreman.id, null, null]);
    expect(getAssignedForemen([foreman, miner], roster, [foreman.id, null, null])).toEqual([foreman]);
  });

  it("moves a foreman between slots", () => {
    expect(assignForemanToTowerSlot(["a", null, null], 2, "a")).toEqual([null, null, "a"]);
  });
});

function createGoblin(id: string, role: "miner" | "collector" | "foreman", statKey: "power" | "speed" | "control"): GoblinConfig {
  return {
    assetId: `asset_${role}`,
    descriptionKey: `goblin.${role}.description`,
    hireCost: [],
    id,
    levels: [
      {
        level: 1,
        stars: [0, 1, 2, 3, 4, 5].map((stars) => ({
          modifiers: [],
          stars: stars as 0 | 1 | 2 | 3 | 4 | 5,
          statValue: 5,
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
