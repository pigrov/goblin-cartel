import { describe, expect, it } from "vitest";
import {
  advanceBuiltMineProduction,
  assignBuiltMineCollector,
  builtMineMaxLevel,
  buildMineFromVein,
  calculateBuiltMineUpgradeCost,
  calculateBuiltMineUpgradeStats,
  canBuildMineFromVein,
  collectAutomatedBuiltMineIncome,
  collectBuiltMineIncome,
  upgradeBuiltMine,
  type BuiltMineType
} from "./built-mines";

const builtMineTypes: BuiltMineType[] = [
  {
    id: "small_copper_mine",
    sourceVeinType: "copper_vein_small",
    productionResourceId: "copper_ore",
    baseProductionPerHour: 120,
    baseCapacity: 300,
    buildCost: [
      { resourceId: "gold", amount: 500 },
      { resourceId: "stone", amount: 120 }
    ],
    buildTimeSec: 60
  }
];

const vein = {
  id: "old_well_01:player-1:8:3:copper_vein_small",
  veinTypeId: "copper_vein_small"
};

describe("built mines", () => {
  it("builds a mine from a found vein and deducts resources", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 1000,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    expect(result).toMatchObject({
      ok: true,
      resources: {
        gold: 300,
        stone: 80
      }
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    expect(result.builtMine).toMatchObject({
      typeId: "small_copper_mine",
      sourceVeinId: vein.id,
      sourceVeinType: "copper_vein_small",
      productionResourceId: "copper_ore",
      status: "building",
      productionPerHour: 120,
      capacity: 300,
      storedAmount: 0,
      startedAt: 1000,
      completesAt: 61000,
      lastProducedAt: 61000
    });
  });

  it("accumulates produced resources after construction and allows manual collection", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 1000,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    const readyAt = result.builtMine.completesAt;
    const produced = advanceBuiltMineProduction(result.builtMine, readyAt + 30 * 60 * 1000);
    const collected = collectBuiltMineIncome({
      builtMine: produced,
      now: readyAt + 30 * 60 * 1000,
      resources: result.resources
    });

    expect(produced).toMatchObject({
      status: "active",
      storedAmount: 60
    });
    expect(collected.collectedAmount).toBe(60);
    expect(collected.builtMine.storedAmount).toBe(0);
    expect(collected.resources).toEqual({
      copper_ore: 60,
      gold: 300,
      stone: 80
    });
  });

  it("caps production at mine storage capacity", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 0,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    const produced = advanceBuiltMineProduction(result.builtMine, result.builtMine.completesAt + 10 * 60 * 60 * 1000);

    expect(produced.storedAmount).toBe(300);
  });

  it("rejects building when resources or matching mine type are missing", () => {
    expect(
      buildMineFromVein({
        builtMineTypes,
        now: 1000,
        resources: {
          gold: 10,
          stone: 10
        },
        vein
      })
    ).toEqual({
      ok: false,
      reason: "not_enough_resources"
    });
    expect(
      buildMineFromVein({
        builtMineTypes,
        now: 1000,
        resources: {
          gold: 800,
          stone: 200
        },
        vein: {
          id: "unknown",
          veinTypeId: "gold_vein_small"
        }
      })
    ).toEqual({
      ok: false,
      reason: "missing_built_mine_type"
    });
    expect(
      canBuildMineFromVein({
        builtMineTypes,
        resources: {
          gold: 800,
          stone: 200
        },
        veinTypeId: "copper_vein_small"
      })
    ).toBe(true);
  });

  it("applies construction support multipliers to build cost and duration", () => {
    expect(
      canBuildMineFromVein({
        buildCostMultiplier: 0.9,
        builtMineTypes,
        resources: {
          gold: 460,
          stone: 110
        },
        veinTypeId: "copper_vein_small"
      })
    ).toBe(true);

    const result = buildMineFromVein({
      buildCostMultiplier: 0.9,
      buildTimeMultiplier: 0.5,
      builtMineTypes,
      now: 1000,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    expect(result).toMatchObject({
      ok: true,
      resources: {
        gold: 350,
        stone: 92
      }
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    expect(result.builtMine).toMatchObject({
      completesAt: 31000,
      lastProducedAt: 31000,
      status: "building"
    });
  });

  it("assigns a collector goblin without changing production state", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 0,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    expect(assignBuiltMineCollector(result.builtMine, "pip_dry_book")).toMatchObject({
      assignedCollectorGoblinId: "pip_dry_book",
      storedAmount: 0
    });
  });

  it("automatically collects income from mines assigned to collectors", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 0,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    const assignedMine = assignBuiltMineCollector(result.builtMine, "pip_dry_book");
    const automated = collectAutomatedBuiltMineIncome({
      builtMines: [assignedMine],
      now: assignedMine.completesAt + 30 * 60 * 1000,
      resources: result.resources
    });

    expect(automated.collectedAmount).toBe(60);
    expect(automated.collectedResources).toEqual({
      copper_ore: 60
    });
    expect(automated.resources).toEqual({
      copper_ore: 60,
      gold: 300,
      stone: 80
    });
    expect(automated.builtMines[0]).toMatchObject({
      assignedCollectorGoblinId: "pip_dry_book",
      status: "active",
      storedAmount: 0
    });
  });

  it("upgrades an active mine and deducts upgrade resources", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 0,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    const activeMine = advanceBuiltMineProduction(result.builtMine, result.builtMine.completesAt + 30 * 60 * 1000);
    const cost = calculateBuiltMineUpgradeCost(activeMine);
    const nextStats = calculateBuiltMineUpgradeStats(activeMine);
    const upgraded = upgradeBuiltMine({
      builtMine: activeMine,
      now: activeMine.lastProducedAt + 1000,
      resources: {
        ...result.resources,
        copper_ore: 80
      }
    });

    expect(cost).toEqual([
      {
        amount: 60,
        resourceId: "copper_ore"
      },
      {
        amount: 100,
        resourceId: "gold"
      }
    ]);
    expect(nextStats).toEqual({
      capacity: 420,
      level: 2,
      productionPerHour: 162
    });
    expect(upgraded).toMatchObject({
      ok: true,
      resources: {
        copper_ore: 20,
        gold: 200,
        stone: 80
      }
    });

    if (!upgraded.ok) {
      throw new Error("Expected upgrade to succeed");
    }

    expect(upgraded.builtMine).toMatchObject({
      capacity: 420,
      level: 2,
      productionPerHour: 162,
      status: "active"
    });
  });

  it("rejects mine upgrades while building, without resources, or at max level", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 0,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    expect(
      upgradeBuiltMine({
        builtMine: result.builtMine,
        now: 1000,
        resources: {
          copper_ore: 500,
          gold: 500
        }
      })
    ).toEqual({
      ok: false,
      cost: [
        {
          amount: 60,
          resourceId: "copper_ore"
        },
        {
          amount: 100,
          resourceId: "gold"
        }
      ],
      reason: "mine_not_active"
    });

    const activeMine = advanceBuiltMineProduction(result.builtMine, result.builtMine.completesAt);

    expect(
      upgradeBuiltMine({
        builtMine: activeMine,
        now: activeMine.lastProducedAt,
        resources: {
          copper_ore: 10,
          gold: 500
        }
      })
    ).toMatchObject({
      ok: false,
      reason: "not_enough_resources"
    });

    expect(
      upgradeBuiltMine({
        builtMine: {
          ...activeMine,
          level: builtMineMaxLevel
        },
        now: activeMine.lastProducedAt,
        resources: {
          copper_ore: 500,
          gold: 500
        }
      })
    ).toEqual({
      ok: false,
      cost: [],
      reason: "max_level"
    });
  });

  it("uses content-driven upgrade balance when provided", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 0,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    const activeMine = advanceBuiltMineProduction(result.builtMine, result.builtMine.completesAt);
    const upgrade = {
      capacityMultiplier: 1.25,
      cost: [
        {
          baseAmount: 30,
          levelMultiplier: 2,
          levelPower: 1,
          useProductionResource: true
        },
        {
          baseAmount: 50,
          levelMultiplier: 1,
          levelPower: 2,
          resourceId: "stone"
        }
      ],
      maxLevel: 3,
      productionMultiplier: 1.2
    };

    expect(calculateBuiltMineUpgradeCost({ ...activeMine, level: 2 }, { upgrade })).toEqual([
      {
        amount: 120,
        resourceId: "copper_ore"
      },
      {
        amount: 200,
        resourceId: "stone"
      }
    ]);

    const upgraded = upgradeBuiltMine({
      builtMine: activeMine,
      now: activeMine.lastProducedAt,
      resources: {
        copper_ore: 80,
        gold: 300,
        stone: 300
      },
      upgrade
    });

    expect(upgraded).toMatchObject({
      ok: true,
      resources: {
        copper_ore: 20,
        gold: 300,
        stone: 250
      }
    });

    if (!upgraded.ok) {
      throw new Error("Expected upgrade to succeed");
    }

    expect(upgraded.builtMine).toMatchObject({
      capacity: 375,
      level: 2,
      productionPerHour: 144
    });
  });

  it("applies construction support multipliers to upgrade cost", () => {
    const result = buildMineFromVein({
      builtMineTypes,
      now: 0,
      resources: {
        gold: 800,
        stone: 200
      },
      vein
    });

    if (!result.ok) {
      throw new Error("Expected build to succeed");
    }

    const activeMine = advanceBuiltMineProduction(result.builtMine, result.builtMine.completesAt);

    expect(calculateBuiltMineUpgradeCost(activeMine, { costMultiplier: 0.8 })).toEqual([
      {
        amount: 48,
        resourceId: "copper_ore"
      },
      {
        amount: 80,
        resourceId: "gold"
      }
    ]);

    const upgraded = upgradeBuiltMine({
      builtMine: activeMine,
      costMultiplier: 0.8,
      now: activeMine.lastProducedAt,
      resources: {
        ...result.resources,
        copper_ore: 60
      }
    });

    expect(upgraded).toMatchObject({
      ok: true,
      resources: {
        copper_ore: 12,
        gold: 220,
        stone: 80
      }
    });
  });
});
