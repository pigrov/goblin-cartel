import { describe, expect, it } from "vitest";
import {
  advanceBuiltMineProduction,
  assignBuiltMineCollector,
  buildMineFromVein,
  canBuildMineFromVein,
  collectBuiltMineIncome,
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
});
