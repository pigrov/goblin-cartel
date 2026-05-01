import { describe, expect, it } from "vitest";
import type { BuiltMineTypeConfig } from "@goblin-cartel/content-schemas";
import type { BuiltMineState, MiningFoundVein } from "@goblin-cartel/game-core";
import {
  canBuildFoundVein,
  collectBuiltMineIncomeWithCollector,
  countCollectorAssignedMines,
  createBuiltMineDashboardState,
  createBuildCostRequirements,
  createBuildCostWithMultiplier,
  createBuiltMineUpgradePreview,
  createConstructionSupportState,
  createVisibleBuiltMines,
  findAssignableCollector,
  findUnbuiltFoundVeins,
  getBuiltMineBuildProgressPercent,
  getBuiltMineBuildRemainingMs,
  getBuiltMineStoragePercent,
  getGoblinBuildCostMultiplier,
  getGoblinBuildTimeMultiplier,
  getGoblinAutoCollectSlots,
  hasCollectorSlotAvailable,
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
  sourceVeinType: "copper_vein_small",
  upgrade: {
    capacityMultiplier: 1.4,
    cost: [
      { useProductionResource: true, baseAmount: 60, levelMultiplier: 1, levelPower: 1 },
      { resourceId: "gold", useProductionResource: false, baseAmount: 100, levelMultiplier: 1, levelPower: 1.35 }
    ],
    maxLevel: 5,
    productionMultiplier: 1.35
  }
};

const collector = {
  ability: {
    descriptionKey: "ability.collect.description",
    effects: [
      { type: "auto_collect_slots" as const, value: 2 },
      { type: "mine_capacity_multiplier" as const, value: 1 }
    ],
    id: "collect",
    nameKey: "ability.collect.name"
  },
  assetId: "goblin_collector_v1",
  baseStats: {
    loyalty: 1,
    luck: 1,
    speed: 1,
    strength: 1
  },
  class: "collector" as const,
  clan: "neutral" as const,
  descriptionKey: "goblin.collector.description",
  hireCost: [],
  id: "collector_1",
  leveling: {
    autoCollectSlotsPerLevel: 0.5,
    cost: [{ baseAmount: 100, levelMultiplier: 1, levelPower: 1, resourceId: "gold" }],
    maxLevel: 5,
    mineCapacityMultiplierPerLevel: 0.05,
    mineProductionMultiplierPerLevel: 0.05,
    statGrowthPerLevel: {
      loyalty: 1,
      luck: 1,
      speed: 1,
      strength: 0
    }
  },
  nameKey: "goblin.collector.name",
  rarity: "common" as const,
  sortOrder: 1,
  specialization: "warehouse_keeper" as const,
  unlockRequirements: []
};

const builder = {
  ...collector,
  ability: {
    descriptionKey: "ability.build.description",
    effects: [
      { type: "build_cost_multiplier" as const, value: 0.9 },
      { type: "build_time_multiplier" as const, value: 0.75 }
    ],
    id: "build",
    nameKey: "ability.build.name"
  },
  class: "builder" as const,
  id: "builder_1",
  nameKey: "goblin.builder.name",
  specialization: "construction_foreman" as const
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

  it("applies construction support to build costs and durations", () => {
    const support = createConstructionSupportState([collector, builder], {
      builder_1: 3
    });

    expect(support).toEqual({
      buildCostMultiplier: 0.9,
      buildTimeMultiplier: 0.75,
      supporterCount: 1,
      upgradeCostMultiplier: 0.9
    });
    expect(getGoblinBuildCostMultiplier(builder)).toBe(0.9);
    expect(getGoblinBuildTimeMultiplier(builder)).toBe(0.75);
    expect(createBuildCostWithMultiplier(builtMineType.buildCost, support.buildCostMultiplier)).toEqual([
      { amount: 450, resourceId: "gold" },
      { amount: 108, resourceId: "stone" }
    ]);
    expect(
      canBuildFoundVein({
        buildCostMultiplier: support.buildCostMultiplier,
        builtMineTypes: [builtMineType],
        builtMines: [],
        resources: {
          gold: 470,
          stone: 110
        },
        vein
      })
    ).toBe(true);
  });

  it("calculates build and storage progress for mine cards", () => {
    expect(getBuiltMineBuildProgressPercent(builtMine, 30_000)).toBe(50);
    expect(getBuiltMineBuildRemainingMs(builtMine, 30_000)).toBe(30_000);
    expect(getBuiltMineStoragePercent({ ...builtMine, capacity: 300, storedAmount: 75 })).toBe(25);
  });

  it("previews built mine upgrades for the UI", () => {
    expect(
      createBuiltMineUpgradePreview(
        {
          ...builtMine,
          completesAt: 0,
          lastProducedAt: 0,
          status: "active"
        },
        {
          copper_ore: 80,
          gold: 120
        },
        undefined,
        0.9
      )
    ).toEqual({
      canUpgrade: true,
      capacityAfter: 420,
      costRequirements: [
        {
          available: 80,
          missing: 0,
          ok: true,
          required: 54,
          resourceId: "copper_ore"
        },
        {
          available: 120,
          missing: 0,
          ok: true,
          required: 90,
          resourceId: "gold"
        }
      ],
      failureReason: null,
      levelAfter: 2,
      maxLevel: 5,
      productionPerHourAfter: 162
    });
  });

  it("explains why built mine upgrade is unavailable", () => {
    expect(createBuiltMineUpgradePreview(builtMine, { copper_ore: 500, gold: 500 }).failureReason).toBe("mine_not_active");
    expect(
      createBuiltMineUpgradePreview(
        {
          ...builtMine,
          completesAt: 0,
          lastProducedAt: 0,
          status: "active"
        },
        {
          copper_ore: 10,
          gold: 500
        }
      ).failureReason
    ).toBe("not_enough_resources");
    expect(
      createBuiltMineUpgradePreview(
        {
          ...builtMine,
          completesAt: 0,
          lastProducedAt: 0,
          level: 5,
          status: "active"
        },
        {
          copper_ore: 500,
          gold: 500
        }
      ).failureReason
    ).toBe("max_level");
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

  it("tracks collector auto-collect slot availability", () => {
    const assignedMines = [
      {
        ...builtMine,
        assignedCollectorGoblinId: collector.id,
        id: "mine-a",
        status: "active" as const
      },
      {
        ...builtMine,
        assignedCollectorGoblinId: collector.id,
        id: "mine-b",
        status: "active" as const
      }
    ];

    expect(getGoblinAutoCollectSlots(collector)).toBe(2);
    expect(countCollectorAssignedMines(collector.id, assignedMines)).toBe(2);
    expect(hasCollectorSlotAvailable(collector, assignedMines, "mine-c")).toBe(false);
    expect(hasCollectorSlotAvailable(collector, assignedMines, "mine-a")).toBe(true);
    expect(findAssignableCollector([collector], assignedMines, "mine-c")).toBeUndefined();
    expect(getGoblinAutoCollectSlots(collector, 3)).toBe(3);
  });

  it("applies collector mine bonuses to visible production and collection without changing base stats", () => {
    const boostedCollector = {
      ...collector,
      ability: {
        ...collector.ability,
        effects: [
          { type: "auto_collect_slots" as const, value: 1 },
          { type: "mine_capacity_multiplier" as const, value: 1.5 },
          { type: "mine_production_multiplier" as const, resourceId: "copper_ore", value: 2 }
        ]
      }
    };
    const assignedMine = {
      ...builtMine,
      assignedCollectorGoblinId: boostedCollector.id,
      completesAt: 0,
      lastProducedAt: 0,
      status: "active" as const
    };

    const visible = createVisibleBuiltMines([assignedMine], 30 * 60 * 1000, [boostedCollector])[0];

    expect(visible).toMatchObject({
      capacity: 450,
      productionPerHour: 240,
      storedAmount: 120
    });

    const collected = collectBuiltMineIncomeWithCollector({
      builtMine: assignedMine,
      collector: boostedCollector,
      now: 30 * 60 * 1000,
      resources: {}
    });

    expect(collected.collectedAmount).toBe(120);
    expect(collected.builtMine).toMatchObject({
      capacity: 300,
      productionPerHour: 120
    });
  });

  it("applies collector level growth to slots and mine bonuses", () => {
    const assignedMine = {
      ...builtMine,
      assignedCollectorGoblinId: collector.id,
      completesAt: 0,
      lastProducedAt: 0,
      status: "active" as const
    };

    const visible = createVisibleBuiltMines([assignedMine], 30 * 60 * 1000, [collector], { collector_1: 3 })[0];

    expect(visible).toMatchObject({
      capacity: 330,
      storedAmount: 60
    });
    expect(hasCollectorSlotAvailable(collector, [{ ...assignedMine, id: "mine-a" }, { ...assignedMine, id: "mine-b" }], "mine-c", 3)).toBe(
      true
    );
  });
});
