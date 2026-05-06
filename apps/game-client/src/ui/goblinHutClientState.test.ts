import { describe, expect, it } from "vitest";
import type { GoblinConfig, GoblinHutConfig } from "@goblin-cartel/content-schemas";
import type { GoblinRosterState } from "@goblin-cartel/game-core";
import {
  createGoblinHirePreview,
  createGoblinHutRoleTabs,
  createGoblinIdentity,
  createGoblinRoleSummary,
  createGoblinUpgradePreview,
  filterGoblinsByHutRole
} from "./goblinHutClientState";

const goblins = [createGoblin("miner", "power"), createGoblin("collector", "speed"), createGoblin("foreman", "control")];
const goblinHut: GoblinHutConfig = {
  id: "default",
  nameKey: "goblin_hut.name",
  levels: [
    {
      hireCostMultiplier: 1,
      level: 1,
      maxHiredGoblins: 1,
      nameKey: "hut.1",
      unlockedRoles: ["miner"],
      upgradeCost: [],
      upgradeCostMultiplier: 1,
      unlockRequirements: []
    },
    {
      hireCostMultiplier: 1,
      level: 2,
      maxHiredGoblins: 3,
      nameKey: "hut.2",
      unlockedRoles: ["miner", "collector", "foreman"],
      upgradeCost: [{ amount: 10, resourceId: "gold" }],
      upgradeCostMultiplier: 1,
      unlockRequirements: []
    }
  ]
};

describe("goblin hut client state", () => {
  it("builds hire previews from fixed role locks", () => {
    const roster: GoblinRosterState = { hiredGoblinIds: [] };

    expect(createGoblinHirePreview({ builtMinesCount: 0, completedMineTemplateIds: [], goblin: goblins[0]!, goblinHut, goblins, resources: {}, roster })).toMatchObject({
      canHire: true,
      failureReason: null
    });
    expect(createGoblinHirePreview({ builtMinesCount: 0, completedMineTemplateIds: [], goblin: goblins[1]!, goblinHut, goblins, resources: { gold: 100 }, roster })).toMatchObject({
      canHire: false,
      failureReason: "role_locked"
    });
  });

  it("requires merged stars before paid goblin level upgrades", () => {
    const roster: GoblinRosterState = {
      hiredGoblinIds: ["goblin:miner:1"],
      instances: [{ equipment: [], goblinId: "miner", id: "goblin:miner:1", level: 1, lifetimeStats: {}, role: "miner", stars: 0 }]
    };
    const runtimeMiner = { ...goblins[0]!, id: "goblin:miner:1" };

    expect(createGoblinUpgradePreview(runtimeMiner, roster, { gold: 100 }, goblinHut)).toMatchObject({
      canUpgrade: false,
      failureReason: "needs_stars",
      levelAfter: 1,
      primaryStatAfter: 5,
      starsAfter: 0
    });

    const fiveStarRoster: GoblinRosterState = {
      ...roster,
      instances: [{ ...roster.instances![0]!, stars: 5 }]
    };

    expect(createGoblinUpgradePreview(runtimeMiner, fiveStarRoster, { gold: 100 }, goblinHut)).toMatchObject({
      canUpgrade: true,
      failureReason: null,
      levelAfter: 2,
      primaryStatAfter: 12,
      starsAfter: 0
    });
  });

  it("summarizes hired role instances", () => {
    const roster: GoblinRosterState = {
      hiredGoblinIds: ["goblin:miner:1", "goblin:collector:1"],
      instances: [
        { equipment: [], goblinId: "miner", id: "goblin:miner:1", level: 1, lifetimeStats: {}, role: "miner", stars: 0 },
        { equipment: [], goblinId: "collector", id: "goblin:collector:1", level: 1, lifetimeStats: {}, role: "collector", stars: 0 }
      ]
    };

    expect(createGoblinRoleSummary(goblins, roster)).toMatchObject({
      collectorCount: 1,
      hiredCount: 2,
      minerCount: 1,
      totalAutoCollectSlots: 1
    });
  });

  it("filters role tabs and resolves identity labels", () => {
    const roster: GoblinRosterState = { hiredGoblinIds: [], hutLevel: 2 };

    expect(filterGoblinsByHutRole(goblins, "foremen")).toEqual([goblins[2]]);
    expect(createGoblinHutRoleTabs(goblins, roster, goblinHut).find((tab) => tab.id === "foremen")?.locked).toBe(false);
    expect(createGoblinIdentity(goblins[0]!, { "goblin.miner.name": "Шахтер", "goblin.miner.description": "Долбит" })).toMatchObject({
      description: "Долбит",
      fullName: "Шахтер"
    });
  });
});

function createGoblin(role: "miner" | "collector" | "foreman", statKey: "power" | "speed" | "control"): GoblinConfig {
  return {
    assetId: `asset_${role}`,
    descriptionKey: `goblin.${role}.description`,
    hireCost: role === "miner" ? [] : [{ amount: 50, resourceId: "gold" }],
    id: role,
    levels: [
      {
        level: 1,
        stars: [0, 1, 2, 3, 4, 5].map((stars) => ({
          modifiers: [],
          stars: stars as 0 | 1 | 2 | 3 | 4 | 5,
          statValue: 5 + stars,
          upgradeCost: stars === 5 ? [{ amount: 10, resourceId: "gold" }] : []
        }))
      },
      {
        level: 2,
        stars: [0, 1, 2, 3, 4, 5].map((stars) => ({
          modifiers: [],
          stars: stars as 0 | 1 | 2 | 3 | 4 | 5,
          statValue: 12 + stars,
          upgradeCost: stars === 5 ? [{ amount: 20, resourceId: "gold" }] : []
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
