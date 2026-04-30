import { describe, expect, it } from "vitest";
import type { BuiltMineTypeConfig } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, MiningFoundVein } from "@goblin-cartel/game-core";
import {
  canBuildFoundVein,
  createBuiltMineDashboardState,
  createBuildCostRequirements,
  createVisibleBuiltMines,
  findUnbuiltFoundVeins,
  getBuiltMineBuildProgressPercent,
  getBuiltMineBuildRemainingMs,
  getBuiltMineStoragePercent,
  hasBuiltMineForVein
} from "./builtMineClientState";

const vein: MiningFoundVein = {
  col: 2,
  id: "old_well:seed:8:2:copper_vein_small",
  mineTemplateId: "old_well",
  row: 8,
  seed: "seed",
  veinTypeId: "copper_vein_small"
};

const builtMine: BuiltMineState = {
  assignedCollectorGoblinId: null,
  capacity: 300,
  completesAt: 60_000,
  id: "small_copper_mine:old_well:seed:8:2:copper_vein_small",
  lastProducedAt: 60_000,
  level: 1,
  productionPerHour: 120,
  productionResourceId: "copper_ore",
  sourceVeinId: vein.id,
  sourceVeinType: "copper_vein_small",
  startedAt: 0,
  status: "building",
  storedAmount: 0,
  typeId: "small_copper_mine"
};

const builtMineType: BuiltMineTypeConfig = {
  assetId: "built_mine_copper_small_v1",
  baseCapacity: 300,
  baseProductionPerHour: 120,
  buildCost: [
    { amount: 500, resourceId: "gold" },
    { amount: 120, resourceId: "stone" }
  ],
  buildTimeSec: 60,
  id: "small_copper_mine",
  nameKey: "built_mine.small_copper.name",
  productionResourceId: "copper_ore",
  sourceVeinType: "copper_vein_small"
};

describe("built mine client state", () => {
  it("hides found veins that already have a built mine", () => {
    expect(hasBuiltMineForVein([builtMine], vein.id)).toBe(true);
    expect(findUnbuiltFoundVeins([vein], [builtMine])).toEqual([]);
    expect(findUnbuiltFoundVeins([vein], [])).toEqual([vein]);
  });

  it("checks resources and duplicate mines before allowing a build", () => {
    expect(
      canBuildFoundVein({
        builtMineTypes: [builtMineType],
        builtMines: [],
        resources: {
          gold: 600,
          stone: 140
        },
        vein
      })
    ).toBe(true);

    expect(
      canBuildFoundVein({
        builtMineTypes: [builtMineType],
        builtMines: [],
        resources: {
          gold: 100,
          stone: 140
        },
        vein
      })
    ).toBe(false);

    expect(
      canBuildFoundVein({
        builtMineTypes: [builtMineType],
        builtMines: [builtMine],
        resources: {
          gold: 600,
          stone: 140
        },
        vein
      })
    ).toBe(false);
  });

  it("advances visible production without mutating saved state", () => {
    const visible = createVisibleBuiltMines([builtMine], 30 * 60 * 1000 + builtMine.completesAt);

    expect(visible[0]).toMatchObject({
      status: "active",
      storedAmount: 60
    });
    expect(builtMine).toMatchObject({
      status: "building",
      storedAmount: 0
    });
  });

  it("builds cost requirement details for the UI", () => {
    expect(
      createBuildCostRequirements(builtMineType.buildCost, {
        gold: 600,
        stone: 100
      })
    ).toEqual([
      {
        available: 600,
        missing: 0,
        ok: true,
        required: 500,
        resourceId: "gold"
      },
      {
        available: 100,
        missing: 20,
        ok: false,
        required: 120,
        resourceId: "stone"
      }
    ]);
  });

  it("calculates build and storage progress for mine cards", () => {
    expect(getBuiltMineBuildProgressPercent(builtMine, 30_000)).toBe(50);
    expect(getBuiltMineBuildRemainingMs(builtMine, 30_000)).toBe(30_000);
    expect(getBuiltMineStoragePercent({ ...builtMine, capacity: 300, storedAmount: 75 })).toBe(25);
  });

  it("summarizes permanent mines for the dashboard screen", () => {
    expect(
      createBuiltMineDashboardState([
        {
          ...builtMine,
          status: "active",
          storedAmount: 132.8
        },
        {
          ...builtMine,
          id: "small_gold_mine:gold",
          productionPerHour: 90,
          productionResourceId: "gold",
          status: "active",
          storedAmount: 300
        },
        {
          ...builtMine,
          id: "small_copper_mine:building",
          status: "building",
          storedAmount: 0
        }
      ])
    ).toEqual({
      activeCount: 2,
      buildingCount: 1,
      collectableMineCount: 2,
      collectableResources: [
        { amount: 132, resourceId: "copper_ore" },
        { amount: 300, resourceId: "gold" }
      ],
      fullCount: 1,
      productionPerHour: [
        { amount: 120, resourceId: "copper_ore" },
        { amount: 90, resourceId: "gold" }
      ]
    });
  });
});
