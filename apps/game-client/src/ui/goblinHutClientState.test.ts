import { describe, expect, it } from "vitest";
import type { ContentBundle, GoblinConfig } from "@goblin-cartel/content-schemas";
import {
  createGoblinHirePreview,
  createGoblinHutProgressionState,
  createGoblinIdentity,
  createGoblinHutRoleTabs,
  createGoblinRoleSummary,
  createGoblinUpgradePreview,
  filterGoblinsByHutRole,
  isMiningGoblin
} from "./goblinHutClientState";

const collector: GoblinConfig = {
  ability: {
    descriptionKey: "ability.collect.description",
    effects: [
      { type: "auto_collect_slots", value: 1 },
      { type: "mine_capacity_multiplier", value: 1.1 }
    ],
    id: "collect",
    nameKey: "ability.collect.name"
  },
  assetId: "goblin_collector_v1",
  baseStats: {
    loyalty: 5,
    luck: 5,
    speed: 4,
    strength: 2
  },
  class: "collector",
  clan: "neutral",
  descriptionKey: "goblin.collector.description",
  hireCost: [{ amount: 100, resourceId: "gold" }],
  id: "collector_1",
  leveling: {
    autoCollectSlotsPerLevel: 0.5,
    buildCostMultiplierPerLevel: 0,
    buildTimeMultiplierPerLevel: 0,
    cost: [
      {
        baseAmount: 80,
        levelMultiplier: 1,
        levelPower: 1,
        resourceId: "gold"
      }
    ],
    maxLevel: 5,
    mineCapacityMultiplierPerLevel: 0.05,
    mineProductionMultiplierPerLevel: 0,
    statGrowthPerLevel: {
      loyalty: 1,
      luck: 1,
      speed: 1,
      strength: 0
    }
  },
  nameKey: "goblin.collector.name",
  nicknameKey: "goblin.collector.nickname",
  rarity: "common",
  sortOrder: 1,
  specialization: "warehouse_keeper",
  unlockRequirements: []
};

const miner: GoblinConfig = {
  ...collector,
  ability: {
    descriptionKey: "ability.hit.description",
    effects: [{ type: "base_damage_bonus", value: 2 }],
    id: "hit",
    nameKey: "ability.hit.name"
  },
  class: "miner",
  id: "miner_1",
  leveling: {
    ...collector.leveling,
    autoCollectSlotsPerLevel: 0,
    buildCostMultiplierPerLevel: 0,
    buildTimeMultiplierPerLevel: 0,
    statGrowthPerLevel: {
      loyalty: 0,
      luck: 0,
      speed: 1,
      strength: 2
    }
  },
  nameKey: "goblin.miner.name",
  nicknameKey: "goblin.miner.nickname",
  specialization: "stonebreaker"
};

const builder: GoblinConfig = {
  ...collector,
  ability: {
    descriptionKey: "ability.build.description",
    effects: [{ type: "build_cost_multiplier", value: 0.9 }],
    id: "build",
    nameKey: "ability.build.name"
  },
  class: "builder",
  id: "builder_1",
  nameKey: "goblin.builder.name",
  nicknameKey: "goblin.builder.nickname",
  specialization: "construction_foreman"
};

const content: ContentBundle = {
  blockTypes: [],
  builtMineTypes: [],
  goblinHut: {
    id: "default" as const,
    levels: [
      {
        hireCostMultiplier: 1,
        level: 1,
        maxHiredGoblins: 2,
        nameKey: "hut.1",
        unlockedClasses: ["miner" as const],
        upgradeCost: [],
        upgradeCostMultiplier: 1,
        unlockRequirements: []
      },
      {
        hireCostMultiplier: 0.9,
        level: 2,
        maxHiredGoblins: 4,
        nameKey: "hut.2",
        unlockedClasses: ["miner" as const, "builder" as const, "collector" as const],
        upgradeCost: [{ amount: 100, resourceId: "gold" }],
        upgradeCostMultiplier: 0.8,
        unlockRequirements: [{ type: "built_mines_count" as const, value: 1 }]
      }
    ],
    nameKey: "hut.name"
  },
  goblins: [builder, collector, miner],
  localization: {
    ru: {}
  },
  mineTemplates: [],
  resources: [
    {
      iconAssetId: "gold",
      id: "gold",
      nameKey: "resource.gold.name",
      rarity: "common" as const,
      sortOrder: 1,
      storageType: "global" as const
    }
  ],
  rewardChestTypes: [],
  veinTypes: []
};

describe("goblin hut client state", () => {
  it("previews upgrade cost and level-based collector slots", () => {
    const preview = createGoblinUpgradePreview(
      collector,
      {
        goblinLevels: {
          collector_1: 2
        },
        hiredGoblinIds: ["collector_1"]
      },
      {
        gold: 200
      }
    );

    expect(preview).toMatchObject({
      autoCollectSlotsAfter: 2,
      autoCollectSlotsNow: 1,
      buildCostMultiplierAfter: 1,
      buildCostMultiplierNow: 1,
      buildTimeMultiplierAfter: 1,
      buildTimeMultiplierNow: 1,
      canUpgrade: true,
      costRequirements: [
        {
          available: 200,
          missing: 0,
          ok: true,
          required: 160,
          resourceId: "gold"
        }
      ],
      failureReason: null,
      levelAfter: 3,
      levelNow: 2,
      maxLevel: 5
    });
  });

  it("blocks upgrades for locked or max-level goblins", () => {
    expect(createGoblinUpgradePreview(collector, { hiredGoblinIds: [] }, { gold: 500 }).failureReason).toBe("not_hired");
    expect(
      createGoblinUpgradePreview(
        collector,
        {
          goblinLevels: {
            collector_1: 5
          },
          hiredGoblinIds: ["collector_1"]
        },
        {
          gold: 500
        }
      ).failureReason
    ).toBe("max_level");
  });

  it("summarizes hired roles for the hut header", () => {
    expect(
      createGoblinRoleSummary([builder, collector, miner], {
        goblinLevels: {
          collector_1: 3
        },
        hiredGoblinIds: ["builder_1", "collector_1", "miner_1"]
      })
    ).toEqual({
      builderCount: 1,
      collectorCount: 1,
      hiredCount: 3,
      minerCount: 1,
      totalAutoCollectSlots: 2
    });
  });

  it("splits hut tabs by goblin role", () => {
    const goblins = [builder, collector, miner];
    const roster = {
      hiredGoblinIds: ["collector_1", "miner_1"]
    };

    expect(createGoblinHutRoleTabs(goblins, roster)).toEqual([
      { count: 3, hiredCount: 2, id: "all", label: "Все", locked: false },
      { count: 1, hiredCount: 1, id: "miners", label: "Шахтеры", locked: false },
      { count: 1, hiredCount: 1, id: "collectors", label: "Сборщики", locked: false },
      { count: 1, hiredCount: 0, id: "builders", label: "Стройка", locked: false }
    ]);
    expect(filterGoblinsByHutRole(goblins, "miners")).toEqual([miner]);
    expect(filterGoblinsByHutRole(goblins, "collectors")).toEqual([collector]);
    expect(filterGoblinsByHutRole(goblins, "builders")).toEqual([builder]);
    expect(goblins.filter(isMiningGoblin)).toEqual([miner]);
  });

  it("previews hut progression and role-locked hires", () => {
    expect(
      createGoblinHirePreview({
        builtMinesCount: 0,
        completedMineTemplateIds: [],
        goblin: builder,
        goblinHut: content.goblinHut,
        goblins: content.goblins,
        resources: {
          gold: 1000
        },
        roster: {
          hiredGoblinIds: ["miner_1"]
        }
      })
    ).toMatchObject({
      canHire: false,
      failureReason: "role_locked"
    });

    const hutState = createGoblinHutProgressionState({
      builtMinesCount: 1,
      completedMineTemplateIds: [],
      content,
      resources: {
        gold: 120
      },
      roster: {
        hiredGoblinIds: ["miner_1"]
      }
    });

    expect(hutState).toMatchObject({
      canUpgrade: true,
      levelNow: 1,
      maxHiredGoblins: 2,
      maxLevel: 2
    });
    expect(hutState.costRequirements).toEqual([
      {
        available: 120,
        missing: 0,
        ok: true,
        required: 100,
        resourceId: "gold"
      }
    ]);
    expect(createGoblinHutRoleTabs(content.goblins, { hiredGoblinIds: ["miner_1"] }, content.goblinHut)[2]).toMatchObject({
      id: "collectors",
      locked: true
    });
  });

  it("splits visible goblin names into name and nickname", () => {
    expect(
      createGoblinIdentity(collector, {
        "goblin.collector.description": "Keeps ledgers.",
        "goblin.collector.name": "Пип",
        "goblin.collector.nickname": "Сухая Книга"
      })
    ).toEqual({
      description: "Keeps ledgers.",
      fullName: "Пип Сухая Книга",
      name: "Пип",
      nickname: "Сухая Книга"
    });

    expect(createGoblinIdentity({ ...collector, nicknameKey: undefined }, { "goblin.collector.name": "Пип Сухая Книга" })).toMatchObject({
      fullName: "Пип Сухая Книга",
      name: "Пип",
      nickname: "Сухая Книга"
    });
  });
});
