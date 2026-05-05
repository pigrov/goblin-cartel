import { z } from "zod";

export const rewardEntrySchema = z.object({
  resourceId: z.string().min(1),
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
  chance: z.number().min(0).max(1)
});

export const resourceAmountSchema = z.object({
  resourceId: z.string().min(1),
  amount: z.number().int().positive()
});

export const goblinClassSchema = z.enum(["miner", "builder", "collector", "foreman"]);
export const goblinClanSchema = z.enum(["rusty_picks", "black_pockets", "bolt_skulls", "neutral"]);
export const goblinSpecializationSchema = z.enum([
  "stonebreaker",
  "ore_sniffer",
  "heavy_striker",
  "warehouse_keeper",
  "resource_expert",
  "construction_foreman",
  "event"
]);

export const goblinBaseStatsSchema = z.object({
  strength: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
  luck: z.number().int().nonnegative(),
  loyalty: z.number().int().nonnegative()
});

export const goblinGenerationStatRangeSchema = z
  .object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative()
  })
  .refine((range) => range.min <= range.max, {
    message: "min must be lower than or equal to max",
    path: ["min"]
  });

export const goblinGenerationStatRangesSchema = z
  .object({
    strength: goblinGenerationStatRangeSchema,
    speed: goblinGenerationStatRangeSchema,
    luck: goblinGenerationStatRangeSchema,
    loyalty: goblinGenerationStatRangeSchema
  })
  .strict();

export const goblinGenerationRarityWeightSchema = z
  .object({
    rarity: z.enum(["common", "rare", "epic", "legendary"]),
    weight: z.number().positive(),
    statMultiplier: z.number().positive().default(1)
  })
  .strict();

export const goblinGenerationTraitSchema = z
  .object({
    id: z.string().min(1),
    nameKey: z.string().min(1).optional(),
    weight: z.number().positive()
  })
  .strict();

export const goblinGenerationRenderSchema = z
  .object({
    assetId: z.string().min(1),
    rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
    weight: z.number().positive()
  })
  .strict();

export const goblinGenerationNamePoolSchema = z
  .object({
    names: z.array(z.string().min(1)).min(1),
    nicknames: z.array(z.string().min(1)).min(1)
  })
  .strict();

export const goblinGenerationArchetypeSchema = z
  .object({
    id: z.string().min(1),
    nameKey: z.string().min(1),
    class: goblinClassSchema,
    specialization: goblinSpecializationSchema.optional(),
    ability: z.lazy(() => goblinAbilitySchema),
    leveling: z.lazy(() => goblinLevelingSchema),
    rarityWeights: z.array(goblinGenerationRarityWeightSchema).min(1),
    statRanges: goblinGenerationStatRangesSchema,
    traitPool: z.array(goblinGenerationTraitSchema).default([]),
    renderPool: z.array(goblinGenerationRenderSchema).min(1),
    equipmentSlots: z.array(z.string().min(1)).default(["tool"]),
    hireCost: z.array(resourceAmountSchema).default([]),
    sortOrder: z.number().int().default(0)
  })
  .strict();

export const goblinGenerationSchema = z
  .object({
    id: z.literal("default").default("default"),
    nameKey: z.string().min(1),
    namePool: goblinGenerationNamePoolSchema,
    archetypes: z.array(goblinGenerationArchetypeSchema).default([])
  })
  .strict();

export const goblinStatGrowthSchema = z.object({
  strength: z.number().nonnegative().default(0),
  speed: z.number().nonnegative().default(0),
  luck: z.number().nonnegative().default(0),
  loyalty: z.number().nonnegative().default(0)
});

export const goblinLevelingCostSchema = z.object({
  resourceId: z.string().min(1),
  baseAmount: z.number().int().positive(),
  levelMultiplier: z.number().positive().default(1),
  levelPower: z.number().nonnegative().default(1)
});

export const goblinLevelingSchema = z.object({
  maxLevel: z.number().int().positive().default(5),
  cost: z.array(goblinLevelingCostSchema).default([]),
  statGrowthPerLevel: goblinStatGrowthSchema.default({
    strength: 0,
    speed: 0,
    luck: 0,
    loyalty: 0
  }),
  autoCollectSlotsPerLevel: z.number().nonnegative().default(0),
  buildCostMultiplierPerLevel: z.number().nonnegative().default(0),
  buildTimeMultiplierPerLevel: z.number().nonnegative().default(0),
  offlineRelocationSlotsPerLevel: z.number().nonnegative().default(0),
  mineCapacityMultiplierPerLevel: z.number().nonnegative().default(0),
  mineProductionMultiplierPerLevel: z.number().nonnegative().default(0)
});

export const goblinAbilityEffectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("damage_bonus_by_tag"),
    tag: z.string().min(1),
    value: z.number().nonnegative()
  }),
  z.object({
    type: z.literal("base_damage_bonus"),
    value: z.number().int().nonnegative()
  }),
  z.object({
    type: z.literal("build_cost_multiplier"),
    value: z.number().positive()
  }),
  z.object({
    type: z.literal("auto_collect_slots"),
    value: z.number().int().positive()
  }),
  z.object({
    type: z.literal("mine_capacity_multiplier"),
    value: z.number().positive()
  }),
  z.object({
    type: z.literal("mine_production_multiplier"),
    resourceId: z.string().min(1).optional(),
    value: z.number().positive()
  }),
  z.object({
    type: z.literal("build_time_multiplier"),
    value: z.number().positive()
  }),
  z.object({
    type: z.literal("auto_select_next_block"),
    enabled: z.boolean().default(true)
  }),
  z.object({
    type: z.literal("offline_relocation_slots"),
    value: z.number().int().positive()
  }),
  z.object({
    type: z.literal("offline_auto_damage_multiplier"),
    value: z.number().positive()
  }),
  z.object({
    type: z.literal("offline_reward_multiplier"),
    value: z.number().positive()
  })
]);

export const goblinAbilitySchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  descriptionKey: z.string().min(1),
  effects: z.array(goblinAbilityEffectSchema).default([])
});

export const goblinUnlockRequirementSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("built_mines_count"),
    value: z.number().int().nonnegative()
  }),
  z.object({
    type: z.literal("mine_completed"),
    mineTemplateId: z.string().min(1)
  }),
  z.object({
    type: z.literal("goblins_by_class"),
    class: goblinClassSchema,
    count: z.number().int().positive()
  }),
  z.object({
    type: z.literal("resource_collected"),
    resourceId: z.string().min(1),
    amount: z.number().int().positive()
  })
]);

export const goblinHutLevelSchema = z.object({
  level: z.number().int().positive(),
  nameKey: z.string().min(1),
  maxHiredGoblins: z.number().int().positive(),
  unlockedClasses: z.array(goblinClassSchema).min(1),
  hireCostMultiplier: z.number().positive().default(1),
  upgradeCostMultiplier: z.number().positive().default(1),
  upgradeCost: z.array(resourceAmountSchema).default([]),
  unlockRequirements: z.array(goblinUnlockRequirementSchema).default([])
});

export const goblinHutSchema = z.object({
  id: z.literal("default").default("default"),
  nameKey: z.string().min(1),
  levels: z.array(goblinHutLevelSchema).min(1)
});

export const elevatorVisualStageSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const elevatorLevelSchema = z.object({
  level: z.number().int().positive(),
  nameKey: z.string().min(1),
  platformSlots: z.number().int().positive(),
  dropDurationMs: z.number().int().min(500).max(2500).default(1450),
  offlineDamageMultiplier: z.number().min(1).default(1),
  stabilityPercent: z.number().int().min(0).max(100).default(20),
  upgradeCost: z.array(resourceAmountSchema).default([]),
  visualStage: elevatorVisualStageSchema.default(1)
});

export const elevatorSchema = z.object({
  id: z.literal("default").default("default"),
  nameKey: z.string().min(1),
  levels: z.array(elevatorLevelSchema).min(1)
});

export const resourceSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  iconAssetId: z.string().min(1),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  storageType: z.enum(["global", "per_mine", "temporary"]).default("global"),
  sortOrder: z.number().int()
});

export const veinTypeSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  resourceId: z.string().min(1),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  assetId: z.string().min(1)
});

export const builtMineUpgradeCostSchema = z
  .object({
    resourceId: z.string().min(1).optional(),
    useProductionResource: z.boolean().default(false),
    baseAmount: z.number().int().positive(),
    levelMultiplier: z.number().positive().default(1),
    levelPower: z.number().nonnegative().default(1)
  })
  .refine((cost) => cost.useProductionResource || Boolean(cost.resourceId), {
    message: "resourceId is required when useProductionResource is false"
  });

export const builtMineUpgradeSchema = z.object({
  maxLevel: z.number().int().positive().default(5),
  productionMultiplier: z.number().min(1).default(1.35),
  capacityMultiplier: z.number().min(1).default(1.4),
  cost: z.array(builtMineUpgradeCostSchema).default([
    {
      useProductionResource: true,
      baseAmount: 60,
      levelMultiplier: 1,
      levelPower: 1
    },
    {
      resourceId: "gold",
      useProductionResource: false,
      baseAmount: 100,
      levelMultiplier: 1,
      levelPower: 1.35
    }
  ])
});

export const builtMineTypeSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  sourceVeinType: z.string().min(1),
  productionResourceId: z.string().min(1),
  baseProductionPerHour: z.number().positive(),
  baseCapacity: z.number().positive(),
  buildCost: z.array(resourceAmountSchema).default([]),
  buildTimeSec: z.number().int().nonnegative().default(0),
  upgrade: builtMineUpgradeSchema.default({
    maxLevel: 5,
    productionMultiplier: 1.35,
    capacityMultiplier: 1.4,
    cost: [
      {
        useProductionResource: true,
        baseAmount: 60,
        levelMultiplier: 1,
        levelPower: 1
      },
      {
        resourceId: "gold",
        useProductionResource: false,
        baseAmount: 100,
        levelMultiplier: 1,
        levelPower: 1.35
      }
    ]
  }),
  assetId: z.string().min(1)
});

export const rewardChestTypeSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  tier: z.enum(["wooden", "iron", "steel", "golden"]).default("wooden"),
  rewardTable: z.array(rewardEntrySchema).min(1),
  assetId: z.string().min(1)
});

export const bossCardRaritySchema = z.enum(["common", "rare", "golden"]);
export const bossCardEffectTypeSchema = z.enum(["damagePerTap", "critChance", "critMultiplier", "maxEnergy"]);

export const bossCardSchema = z
  .object({
    id: z.string().min(1),
    nameKey: z.string().min(1),
    descriptionKey: z.string().min(1),
    rarity: bossCardRaritySchema.default("common"),
    assetId: z.string().min(1).default("boss_card_generic_v1"),
    cardResourceId: z.string().min(1),
    effectType: bossCardEffectTypeSchema,
    valuePerLevel: z.number().positive(),
    maxLevel: z.number().int().positive().default(8),
    upgradeCardAmounts: z.array(z.number().int().positive()).min(1).default([2, 5, 10, 20, 50, 100, 180, 300]),
    elixirResourceId: z.string().min(1).default("elixir"),
    elixirCostMultiplier: z.number().positive().default(4),
    sortOrder: z.number().int().default(0)
  })
  .strict();

export const blockTypeSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  baseHp: z.number().int().positive(),
  tags: z.array(z.string().min(1)).default([]),
  visualStateAssets: z.object({
    intact: z.string().min(1),
    cracked: z.string().min(1),
    breaking: z.string().min(1)
  }),
  rewardTable: z.array(rewardEntrySchema),
  specialBehavior: z.enum(["none", "explosion"]).default("none")
});

export const mineCellSchema = z
  .object({
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
    blockTypeId: z.string().min(1),
    hp: z.number().positive().optional(),
    rewardChestTypeId: z.string().min(1).optional(),
    special: z.literal("reward_chest").optional()
  })
  .strict();

export const mineDepthProgressRewardSchema = z
  .object({
    resourceId: z.string().min(1),
    amountPerMeter: z.number().positive(),
    multiplier: z.number().positive().default(1),
    maxAmount: z.number().int().positive().optional()
  })
  .strict();

export const mineTemplateSchema = z
  .object({
    id: z.string().min(1),
    displayNameKey: z.string().min(1),
    sortOrder: z.number().int().default(0),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    depthMeters: z.number().int().positive(),
    difficultyStart: z.number().positive().default(1),
    difficultyEnd: z.number().positive().default(1),
    completionVeinTypeId: z.string().min(1).optional(),
    completionRewardChestTypeId: z.string().min(1).optional(),
    depthProgressReward: mineDepthProgressRewardSchema.optional(),
    cellMap: z.array(mineCellSchema).min(1)
  })
  .strict();

export const goblinSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  nicknameKey: z.string().min(1).optional(),
  descriptionKey: z.string().min(1),
  class: goblinClassSchema,
  specialization: goblinSpecializationSchema.optional(),
  clan: goblinClanSchema.default("neutral"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  assetId: z.string().min(1),
  baseStats: goblinBaseStatsSchema,
  ability: goblinAbilitySchema,
  hireCost: z.array(resourceAmountSchema).default([]),
  leveling: goblinLevelingSchema.default({
    maxLevel: 5,
    cost: [],
    statGrowthPerLevel: {
      strength: 0,
      speed: 0,
      luck: 0,
      loyalty: 0
    },
    autoCollectSlotsPerLevel: 0,
    buildCostMultiplierPerLevel: 0,
    buildTimeMultiplierPerLevel: 0,
    offlineRelocationSlotsPerLevel: 0,
    mineCapacityMultiplierPerLevel: 0,
    mineProductionMultiplierPerLevel: 0
  }),
  unlockRequirements: z.array(goblinUnlockRequirementSchema).default([]),
  sortOrder: z.number().int()
});

export const localizationSchema = z.record(z.string().min(2), z.record(z.string().min(1), z.string().min(1))).default({});

export const contentBundleSchema = z
  .object({
    resources: z.array(resourceSchema).min(1),
    blockTypes: z.array(blockTypeSchema).min(1),
    veinTypes: z.array(veinTypeSchema).default([]),
    builtMineTypes: z.array(builtMineTypeSchema).default([]),
    rewardChestTypes: z.array(rewardChestTypeSchema).default([]),
    bossCards: z.array(bossCardSchema).default([]),
    mineTemplates: z.array(mineTemplateSchema).min(1),
    goblinGeneration: goblinGenerationSchema.default({
      id: "default",
      nameKey: "goblin_generation.name",
      namePool: {
        names: ["Крикк"],
        nicknames: ["Ржавое Ухо"]
      },
      archetypes: []
    }),
    goblinHut: goblinHutSchema,
    elevator: elevatorSchema,
    localization: localizationSchema
  })
  .strict();

export type ResourceConfig = z.infer<typeof resourceSchema>;
export type VeinTypeConfig = z.infer<typeof veinTypeSchema>;
export type BuiltMineTypeConfig = z.infer<typeof builtMineTypeSchema>;
export type RewardChestTypeConfig = z.infer<typeof rewardChestTypeSchema>;
export type BossCardConfig = z.infer<typeof bossCardSchema>;
export type BlockTypeConfig = z.infer<typeof blockTypeSchema>;
export type MineCellConfig = z.infer<typeof mineCellSchema>;
export type MineTemplateConfig = z.infer<typeof mineTemplateSchema>;
export type GoblinConfig = z.infer<typeof goblinSchema>;
export type GoblinGenerationConfig = z.infer<typeof goblinGenerationSchema>;
export type GoblinGenerationArchetypeConfig = z.infer<typeof goblinGenerationArchetypeSchema>;
export type GoblinHutConfig = z.infer<typeof goblinHutSchema>;
export type GoblinHutLevelConfig = z.infer<typeof goblinHutLevelSchema>;
export type ElevatorConfig = z.infer<typeof elevatorSchema>;
export type ElevatorLevelConfig = z.infer<typeof elevatorLevelSchema>;
export type LocalizationConfig = z.infer<typeof localizationSchema>;
export type ContentBundle = z.infer<typeof contentBundleSchema>;

function createStarterGeneratedMineCellMap(height: number, tier: number): MineCellConfig[] {
  const width = 7;
  const pattern = ["dirt", "stone", "stone", "copper_ore", "stone", "iron_ore", "gold_cache"];
  const cells: MineCellConfig[] = [];

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const depthWeight = row / Math.max(1, height - 1);
      const roll = (row * 11 + col * 7 + tier * 5) % 17;
      let blockTypeId = pattern[(roll + tier) % pattern.length] ?? "stone";

      if (depthWeight < 0.25 && blockTypeId === "iron_ore") {
        blockTypeId = "stone";
      }

      if (depthWeight < 0.45 && blockTypeId === "gold_cache") {
        blockTypeId = roll % 2 === 0 ? "stone" : "copper_ore";
      }

      if (tier < 3 && blockTypeId === "iron_ore") {
        blockTypeId = "copper_ore";
      }

      if (row === height - 1 && col % 3 === tier % 3) {
        blockTypeId = tier >= 6 ? "iron_ore" : tier >= 3 ? "copper_ore" : "stone";
      }

      cells.push({ blockTypeId, col, row });
    }
  }

  return cells;
}

function createStarterMineTemplates(): MineTemplateConfig[] {
  const mineConfigs = [
    ["old_well_01", "mine.old_well.name", 3, "gold_vein_small", "wooden_completion_chest", "stone", 3, 12],
    ["abandoned_crosscut_02", "mine.abandoned_crosscut.name", 4, "copper_vein_small", "iron_completion_chest", "stone", 4, 16],
    ["lower_gallery_03", "mine.lower_gallery.name", 5, "iron_vein_small", "steel_completion_chest", "copper_ore", 2, 10],
    ["sunken_works_04", "mine.sunken_works.name", 6, "gold_vein_small", "iron_completion_chest", "copper_ore", 3, 12],
    ["red_iron_drop_05", "mine.red_iron_drop.name", 7, "copper_vein_small", "steel_completion_chest", "iron", 1, 6],
    ["black_rib_06", "mine.black_rib.name", 8, "iron_vein_small", "steel_completion_chest", "stone", 5, 22],
    ["copper_stairs_07", "mine.copper_stairs.name", 9, "copper_vein_small", "iron_completion_chest", "copper_ore", 4, 20],
    ["golden_draft_08", "mine.golden_draft.name", 10, "gold_vein_small", "steel_completion_chest", "gold", 1, 8],
    ["iron_throat_09", "mine.iron_throat.name", 10, "iron_vein_small", "steel_completion_chest", "iron", 2, 12],
    ["cartel_root_10", "mine.cartel_root.name", 10, "gold_vein_small", "steel_completion_chest", "copper_ore", 5, 25]
  ] as const;

  return mineConfigs.map(([id, displayNameKey, height, completionVeinTypeId, completionRewardChestTypeId, resourceId, amountPerMeter, maxAmount], index) => ({
    cellMap: createStarterGeneratedMineCellMap(height, index + 1),
    completionRewardChestTypeId,
    completionVeinTypeId,
    depthMeters: height,
    depthProgressReward: { amountPerMeter, maxAmount, multiplier: 1, resourceId },
    difficultyEnd: Math.round((1.15 + index * 0.05) * 100) / 100,
    difficultyStart: Math.round((1 + index * 0.05) * 100) / 100,
    displayNameKey,
    height,
    id,
    sortOrder: (index + 1) * 10,
    width: 7
  }));
}

function createStarterGoblinNamePool(): GoblinGenerationConfig["namePool"] {
  const nameRoots = [
    "Крикк",
    "Грызз",
    "Шмык",
    "Бырк",
    "Румм",
    "Тикк",
    "Нокк",
    "Скрэпп",
    "Вжикк",
    "Хрумм",
    "Дрынк",
    "Пырк",
    "Клакк",
    "Жмых",
    "Фырк",
    "Грохх",
    "Мурк",
    "Блимм",
    "Цокк",
    "Шарк"
  ];
  const nameSuffixes = ["", "о", "ар", "ик", "ун", "аш"];
  const nicknameAdjectives = [
    "Ржавое",
    "Кривое",
    "Медное",
    "Тяжелое",
    "Сухое",
    "Железное",
    "Гулкое",
    "Хитрое",
    "Черное",
    "Пыльное",
    "Острое",
    "Старое",
    "Ломкое",
    "Громкое",
    "Тусклое",
    "Злое",
    "Быстрое",
    "Копченое",
    "Каменное",
    "Шумное"
  ];
  const nicknameNouns = ["Ухо", "Зубило", "Каска", "Плечо", "Перо", "Репа"];

  return {
    names: nameRoots.flatMap((root) => nameSuffixes.map((suffix) => `${root}${suffix}`)),
    nicknames: nicknameAdjectives.flatMap((adjective) => nicknameNouns.map((noun) => `${adjective} ${noun}`))
  };
}

export interface ContentValidationResult {
  ok: boolean;
  errors: string[];
}

function createStarterMinerLeveling(goldBaseAmount: number) {
  return {
    maxLevel: 5,
    cost: [{ resourceId: "gold", baseAmount: goldBaseAmount, levelMultiplier: 1, levelPower: 1.25 }],
    statGrowthPerLevel: {
      strength: 2,
      speed: 1,
      luck: 0,
      loyalty: 0
    },
    autoCollectSlotsPerLevel: 0,
    buildCostMultiplierPerLevel: 0,
    buildTimeMultiplierPerLevel: 0,
    offlineRelocationSlotsPerLevel: 0,
    mineCapacityMultiplierPerLevel: 0,
    mineProductionMultiplierPerLevel: 0
  };
}

function createStarterCollectorLeveling(goldBaseAmount: number) {
  return {
    maxLevel: 5,
    cost: [{ resourceId: "gold", baseAmount: goldBaseAmount, levelMultiplier: 1, levelPower: 1.3 }],
    statGrowthPerLevel: {
      strength: 0,
      speed: 1,
      luck: 1,
      loyalty: 1
    },
    autoCollectSlotsPerLevel: 0.5,
    buildCostMultiplierPerLevel: 0,
    buildTimeMultiplierPerLevel: 0,
    offlineRelocationSlotsPerLevel: 0,
    mineCapacityMultiplierPerLevel: 0.03,
    mineProductionMultiplierPerLevel: 0.03
  };
}

export const starterContentBundle: ContentBundle = {
  resources: [
    {
      id: "gold",
      nameKey: "resource.gold.name",
      iconAssetId: "icon_gold_v1",
      rarity: "common",
      storageType: "global",
      sortOrder: 10
    },
    {
      id: "stone",
      nameKey: "resource.stone.name",
      iconAssetId: "icon_stone_v1",
      rarity: "common",
      storageType: "global",
      sortOrder: 20
    },
    {
      id: "copper_ore",
      nameKey: "resource.copper_ore.name",
      iconAssetId: "icon_copper_ore_v1",
      rarity: "common",
      storageType: "global",
      sortOrder: 30
    },
    {
      id: "iron",
      nameKey: "resource.iron.name",
      iconAssetId: "icon_iron_v1",
      rarity: "common",
      storageType: "global",
      sortOrder: 35
    },
    {
      id: "elixir",
      nameKey: "resource.elixir.name",
      iconAssetId: "icon_elixir_v1",
      rarity: "rare",
      storageType: "global",
      sortOrder: 45
    },
    {
      id: "boss_energy",
      nameKey: "resource.boss_energy.name",
      iconAssetId: "icon_boss_energy_v1",
      rarity: "rare",
      storageType: "temporary",
      sortOrder: 50
    },
    {
      id: "boss_card_hit_damage",
      nameKey: "resource.boss_card_hit_damage.name",
      iconAssetId: "icon_boss_card_hit_damage_v1",
      rarity: "common",
      storageType: "global",
      sortOrder: 90
    },
    {
      id: "boss_card_crit_chance",
      nameKey: "resource.boss_card_crit_chance.name",
      iconAssetId: "icon_boss_card_crit_chance_v1",
      rarity: "rare",
      storageType: "global",
      sortOrder: 91
    },
    {
      id: "boss_card_crit_multiplier",
      nameKey: "resource.boss_card_crit_multiplier.name",
      iconAssetId: "icon_boss_card_crit_multiplier_v1",
      rarity: "legendary",
      storageType: "global",
      sortOrder: 92
    },
    {
      id: "boss_card_max_energy",
      nameKey: "resource.boss_card_max_energy.name",
      iconAssetId: "icon_boss_card_max_energy_v1",
      rarity: "common",
      storageType: "global",
      sortOrder: 93
    }
  ],
  blockTypes: [
    {
      id: "dirt",
      nameKey: "block.dirt.name",
      baseHp: 20,
      tags: ["soft"],
      visualStateAssets: {
        intact: "block_dirt_intact_v1",
        cracked: "block_dirt_cracked_v1",
        breaking: "block_dirt_breaking_v1"
      },
      rewardTable: [
        { resourceId: "stone", min: 1, max: 3, chance: 1 },
        { resourceId: "gold", min: 1, max: 5, chance: 0.05 },
        { resourceId: "elixir", min: 1, max: 1, chance: 0.04 }
      ],
      specialBehavior: "none"
    },
    {
      id: "stone",
      nameKey: "block.stone.name",
      baseHp: 60,
      tags: ["rock"],
      visualStateAssets: {
        intact: "block_stone_intact_v1",
        cracked: "block_stone_cracked_v1",
        breaking: "block_stone_breaking_v1"
      },
      rewardTable: [
        { resourceId: "stone", min: 3, max: 8, chance: 1 },
        { resourceId: "elixir", min: 1, max: 1, chance: 0.06 }
      ],
      specialBehavior: "none"
    },
    {
      id: "copper_ore",
      nameKey: "block.copper_ore.name",
      baseHp: 120,
      tags: ["rock", "ore", "copper"],
      visualStateAssets: {
        intact: "block_copper_ore_intact_v1",
        cracked: "block_copper_ore_cracked_v1",
        breaking: "block_copper_ore_breaking_v1"
      },
      rewardTable: [
        { resourceId: "copper_ore", min: 4, max: 12, chance: 1 },
        { resourceId: "gold", min: 5, max: 15, chance: 0.1 },
        { resourceId: "elixir", min: 1, max: 2, chance: 0.08 }
      ],
      specialBehavior: "none"
    },
    {
      id: "iron_ore",
      nameKey: "block.iron_ore.name",
      baseHp: 180,
      tags: ["rock", "ore", "iron"],
      visualStateAssets: {
        intact: "block_iron_ore_intact_v1",
        cracked: "block_iron_ore_cracked_v1",
        breaking: "block_iron_ore_breaking_v1"
      },
      rewardTable: [
        { resourceId: "iron", min: 3, max: 9, chance: 1 },
        { resourceId: "gold", min: 8, max: 18, chance: 0.08 },
        { resourceId: "elixir", min: 1, max: 2, chance: 0.1 }
      ],
      specialBehavior: "none"
    },
    {
      id: "gold_cache",
      nameKey: "block.gold_cache.name",
      baseHp: 40,
      tags: ["gold", "cache"],
      visualStateAssets: {
        intact: "block_gold_cache_intact_v1",
        cracked: "block_gold_cache_cracked_v1",
        breaking: "block_gold_cache_breaking_v1"
      },
      rewardTable: [
        { resourceId: "gold", min: 25, max: 80, chance: 1 },
        { resourceId: "boss_energy", min: 5, max: 15, chance: 0.75 },
        { resourceId: "elixir", min: 2, max: 4, chance: 0.16 }
      ],
      specialBehavior: "none"
    }
  ],
  veinTypes: [
    {
      id: "gold_vein_small",
      nameKey: "vein.gold_small.name",
      resourceId: "gold",
      rarity: "common",
      assetId: "vein_gold_small_v1"
    },
    {
      id: "copper_vein_small",
      nameKey: "vein.copper_small.name",
      resourceId: "copper_ore",
      rarity: "common",
      assetId: "vein_copper_small_v1"
    },
    {
      id: "iron_vein_small",
      nameKey: "vein.iron_small.name",
      resourceId: "iron",
      rarity: "rare",
      assetId: "vein_iron_small_v1"
    }
  ],
  builtMineTypes: [
    {
      id: "small_gold_mine",
      nameKey: "built_mine.small_gold.name",
      sourceVeinType: "gold_vein_small",
      productionResourceId: "gold",
      baseProductionPerHour: 90,
      baseCapacity: 220,
      buildCost: [
        { resourceId: "stone", amount: 40 },
        { resourceId: "copper_ore", amount: 10 }
      ],
      buildTimeSec: 45,
      upgrade: {
        maxLevel: 5,
        productionMultiplier: 1.3,
        capacityMultiplier: 1.35,
        cost: [
          { useProductionResource: true, baseAmount: 50, levelMultiplier: 1, levelPower: 1 },
          { resourceId: "stone", useProductionResource: false, baseAmount: 40, levelMultiplier: 1, levelPower: 1.2 }
        ]
      },
      assetId: "built_mine_gold_small_v1"
    },
    {
      id: "small_copper_mine",
      nameKey: "built_mine.small_copper.name",
      sourceVeinType: "copper_vein_small",
      productionResourceId: "copper_ore",
      baseProductionPerHour: 120,
      baseCapacity: 300,
      buildCost: [
        { resourceId: "gold", amount: 500 },
        { resourceId: "stone", amount: 120 }
      ],
      buildTimeSec: 60,
      upgrade: {
        maxLevel: 5,
        productionMultiplier: 1.35,
        capacityMultiplier: 1.4,
        cost: [
          { useProductionResource: true, baseAmount: 60, levelMultiplier: 1, levelPower: 1 },
          { resourceId: "gold", useProductionResource: false, baseAmount: 100, levelMultiplier: 1, levelPower: 1.35 }
        ]
      },
      assetId: "built_mine_copper_small_v1"
    },
    {
      id: "small_iron_mine",
      nameKey: "built_mine.small_iron.name",
      sourceVeinType: "iron_vein_small",
      productionResourceId: "iron",
      baseProductionPerHour: 90,
      baseCapacity: 240,
      buildCost: [
        { resourceId: "gold", amount: 900 },
        { resourceId: "stone", amount: 220 },
        { resourceId: "copper_ore", amount: 80 }
      ],
      buildTimeSec: 90,
      upgrade: {
        maxLevel: 5,
        productionMultiplier: 1.32,
        capacityMultiplier: 1.38,
        cost: [
          { useProductionResource: true, baseAmount: 45, levelMultiplier: 1, levelPower: 1 },
          { resourceId: "gold", useProductionResource: false, baseAmount: 140, levelMultiplier: 1, levelPower: 1.35 },
          { resourceId: "copper_ore", useProductionResource: false, baseAmount: 35, levelMultiplier: 1, levelPower: 1.15 }
        ]
      },
      assetId: "built_mine_iron_small_v1"
    }
  ],
  rewardChestTypes: [
    {
      id: "wooden_completion_chest",
      nameKey: "reward_chest.wooden.name",
      tier: "wooden",
      rewardTable: [
        { resourceId: "gold", min: 90, max: 150, chance: 1 },
        { resourceId: "stone", min: 45, max: 90, chance: 1 },
        { resourceId: "copper_ore", min: 15, max: 35, chance: 0.8 },
        { resourceId: "elixir", min: 5, max: 9, chance: 1 },
        { resourceId: "boss_card_hit_damage", min: 1, max: 2, chance: 1 },
        { resourceId: "boss_card_max_energy", min: 1, max: 1, chance: 0.75 },
        { resourceId: "boss_card_crit_chance", min: 1, max: 1, chance: 0.18 }
      ],
      assetId: "reward_chest_wooden_v1"
    },
    {
      id: "iron_completion_chest",
      nameKey: "reward_chest.iron.name",
      tier: "iron",
      rewardTable: [
        { resourceId: "gold", min: 160, max: 260, chance: 1 },
        { resourceId: "stone", min: 90, max: 160, chance: 1 },
        { resourceId: "copper_ore", min: 35, max: 80, chance: 1 },
        { resourceId: "iron", min: 12, max: 28, chance: 0.35 },
        { resourceId: "elixir", min: 10, max: 18, chance: 1 },
        { resourceId: "boss_card_hit_damage", min: 2, max: 3, chance: 1 },
        { resourceId: "boss_card_max_energy", min: 1, max: 2, chance: 0.9 },
        { resourceId: "boss_card_crit_chance", min: 1, max: 2, chance: 0.7 },
        { resourceId: "boss_card_crit_multiplier", min: 1, max: 1, chance: 0.2 }
      ],
      assetId: "reward_chest_iron_v1"
    },
    {
      id: "steel_completion_chest",
      nameKey: "reward_chest.steel.name",
      tier: "steel",
      rewardTable: [
        { resourceId: "gold", min: 280, max: 440, chance: 1 },
        { resourceId: "stone", min: 160, max: 260, chance: 1 },
        { resourceId: "copper_ore", min: 90, max: 150, chance: 1 },
        { resourceId: "iron", min: 35, max: 90, chance: 0.75 },
        { resourceId: "elixir", min: 18, max: 32, chance: 1 },
        { resourceId: "boss_card_hit_damage", min: 3, max: 5, chance: 1 },
        { resourceId: "boss_card_max_energy", min: 2, max: 4, chance: 1 },
        { resourceId: "boss_card_crit_chance", min: 2, max: 3, chance: 0.9 },
        { resourceId: "boss_card_crit_multiplier", min: 1, max: 2, chance: 0.55 }
      ],
      assetId: "reward_chest_steel_v1"
    }
  ],
  bossCards: [
    {
      id: "hit_damage",
      nameKey: "boss_card.hit_damage.name",
      descriptionKey: "boss_card.hit_damage.description",
      rarity: "common",
      assetId: "boss_card_hit_damage_v1",
      cardResourceId: "boss_card_hit_damage",
      effectType: "damagePerTap",
      valuePerLevel: 4,
      maxLevel: 8,
      upgradeCardAmounts: [2, 5, 10, 20, 50, 100, 180, 300],
      elixirResourceId: "elixir",
      elixirCostMultiplier: 4,
      sortOrder: 10
    },
    {
      id: "crit_chance",
      nameKey: "boss_card.crit_chance.name",
      descriptionKey: "boss_card.crit_chance.description",
      rarity: "rare",
      assetId: "boss_card_crit_chance_v1",
      cardResourceId: "boss_card_crit_chance",
      effectType: "critChance",
      valuePerLevel: 0.015,
      maxLevel: 8,
      upgradeCardAmounts: [2, 5, 10, 20, 50, 100, 180, 300],
      elixirResourceId: "elixir",
      elixirCostMultiplier: 6,
      sortOrder: 20
    },
    {
      id: "crit_multiplier",
      nameKey: "boss_card.crit_multiplier.name",
      descriptionKey: "boss_card.crit_multiplier.description",
      rarity: "golden",
      assetId: "boss_card_crit_multiplier_v1",
      cardResourceId: "boss_card_crit_multiplier",
      effectType: "critMultiplier",
      valuePerLevel: 0.12,
      maxLevel: 8,
      upgradeCardAmounts: [2, 5, 10, 20, 50, 100, 180, 300],
      elixirResourceId: "elixir",
      elixirCostMultiplier: 9,
      sortOrder: 30
    },
    {
      id: "max_energy",
      nameKey: "boss_card.max_energy.name",
      descriptionKey: "boss_card.max_energy.description",
      rarity: "common",
      assetId: "boss_card_max_energy_v1",
      cardResourceId: "boss_card_max_energy",
      effectType: "maxEnergy",
      valuePerLevel: 45,
      maxLevel: 8,
      upgradeCardAmounts: [2, 5, 10, 20, 50, 100, 180, 300],
      elixirResourceId: "elixir",
      elixirCostMultiplier: 4,
      sortOrder: 40
    }
  ],
  mineTemplates: createStarterMineTemplates(),
  goblinGeneration: {
    id: "default",
    nameKey: "goblin_generation.name",
    namePool: createStarterGoblinNamePool(),
    archetypes: [
      {
        id: "random_miner_contract",
        nameKey: "goblin_generation.random_miner_contract.name",
        class: "miner",
        ability: {
          id: "stone_biter",
          nameKey: "ability.stone_biter.name",
          descriptionKey: "ability.stone_biter.description",
          effects: [{ type: "damage_bonus_by_tag", tag: "rock", value: 0.2 }]
        },
        leveling: createStarterMinerLeveling(120),
        rarityWeights: [
          { rarity: "common", weight: 78, statMultiplier: 1 },
          { rarity: "rare", weight: 18, statMultiplier: 1.15 },
          { rarity: "epic", weight: 3.5, statMultiplier: 1.35 },
          { rarity: "legendary", weight: 0.5, statMultiplier: 1.6 }
        ],
        statRanges: {
          strength: { min: 5, max: 12 },
          speed: { min: 3, max: 7 },
          luck: { min: 1, max: 5 },
          loyalty: { min: 3, max: 8 }
        },
        traitPool: [
          { id: "stone_focus", nameKey: "goblin_trait.stone_focus.name", weight: 45 },
          { id: "ore_eye", nameKey: "goblin_trait.ore_eye.name", weight: 30 },
          { id: "steady_hands", nameKey: "goblin_trait.steady_hands.name", weight: 25 }
        ],
        renderPool: [
          { assetId: "goblin_gryzz_v1", rarity: "common", weight: 10 },
          { assetId: "goblin_myk_v1", rarity: "common", weight: 10 },
          { assetId: "goblin_skrapp_v1", rarity: "rare", weight: 6 }
        ],
        equipmentSlots: ["tool"],
        hireCost: [{ resourceId: "gold", amount: 220 }],
        sortOrder: 10
      },
      {
        id: "random_collector_contract",
        nameKey: "goblin_generation.random_collector_contract.name",
        class: "collector",
        specialization: "warehouse_keeper",
        ability: {
          id: "boring_order",
          nameKey: "ability.boring_order.name",
          descriptionKey: "ability.boring_order.description",
          effects: [
            { type: "auto_collect_slots", value: 1 },
            { type: "mine_capacity_multiplier", value: 1.15 }
          ]
        },
        leveling: createStarterCollectorLeveling(900),
        rarityWeights: [
          { rarity: "common", weight: 70, statMultiplier: 1 },
          { rarity: "rare", weight: 24, statMultiplier: 1.15 },
          { rarity: "epic", weight: 5, statMultiplier: 1.35 },
          { rarity: "legendary", weight: 1, statMultiplier: 1.6 }
        ],
        statRanges: {
          strength: { min: 1, max: 4 },
          speed: { min: 3, max: 8 },
          luck: { min: 5, max: 11 },
          loyalty: { min: 5, max: 10 }
        },
        traitPool: [
          { id: "careful_pockets", nameKey: "goblin_trait.careful_pockets.name", weight: 45 },
          { id: "long_list", nameKey: "goblin_trait.long_list.name", weight: 35 },
          { id: "quiet_count", nameKey: "goblin_trait.quiet_count.name", weight: 20 }
        ],
        renderPool: [
          { assetId: "goblin_pip_v1", rarity: "common", weight: 10 },
          { assetId: "goblin_nokk_v1", rarity: "rare", weight: 6 }
        ],
        equipmentSlots: ["ledger"],
        hireCost: [
          { resourceId: "gold", amount: 900 },
          { resourceId: "stone", amount: 80 }
        ],
        sortOrder: 20
      },
      {
        id: "random_foreman_contract",
        nameKey: "goblin_generation.random_foreman_contract.name",
        class: "foreman",
        ability: {
          id: "no_idle_picks",
          nameKey: "ability.no_idle_picks.name",
          descriptionKey: "ability.no_idle_picks.description",
          effects: [
            { type: "auto_select_next_block", enabled: true },
            { type: "offline_relocation_slots", value: 1 },
            { type: "offline_auto_damage_multiplier", value: 1.1 },
            { type: "offline_reward_multiplier", value: 1.05 },
            { type: "build_time_multiplier", value: 0.9 }
          ]
        },
        leveling: {
          maxLevel: 5,
          cost: [{ resourceId: "gold", baseAmount: 1400, levelMultiplier: 1, levelPower: 1.32 }],
          statGrowthPerLevel: {
            strength: 1,
            speed: 1,
            luck: 0,
            loyalty: 1
          },
          autoCollectSlotsPerLevel: 0,
          buildCostMultiplierPerLevel: 0,
          buildTimeMultiplierPerLevel: 0.015,
          offlineRelocationSlotsPerLevel: 1,
          mineCapacityMultiplierPerLevel: 0,
          mineProductionMultiplierPerLevel: 0
        },
        rarityWeights: [
          { rarity: "common", weight: 62, statMultiplier: 1 },
          { rarity: "rare", weight: 30, statMultiplier: 1.15 },
          { rarity: "epic", weight: 7, statMultiplier: 1.35 },
          { rarity: "legendary", weight: 1, statMultiplier: 1.6 }
        ],
        statRanges: {
          strength: { min: 4, max: 8 },
          speed: { min: 4, max: 8 },
          luck: { min: 2, max: 6 },
          loyalty: { min: 6, max: 11 }
        },
        traitPool: [
          { id: "sharp_whistle", nameKey: "goblin_trait.sharp_whistle.name", weight: 40 },
          { id: "night_orders", nameKey: "goblin_trait.night_orders.name", weight: 35 },
          { id: "strict_shift", nameKey: "goblin_trait.strict_shift.name", weight: 25 }
        ],
        renderPool: [
          { assetId: "goblin_krakk_v1", rarity: "common", weight: 10 },
          { assetId: "goblin_brikk_v1", rarity: "rare", weight: 6 }
        ],
        equipmentSlots: ["whistle"],
        hireCost: [
          { resourceId: "gold", amount: 2400 },
          { resourceId: "copper_ore", amount: 120 }
        ],
        sortOrder: 30
      }
    ]
  },
  goblinHut: {
    id: "default",
    nameKey: "goblin_hut.name",
    levels: [
      {
        level: 1,
        nameKey: "goblin_hut.level.1.name",
        maxHiredGoblins: 2,
        unlockedClasses: ["miner"],
        hireCostMultiplier: 1,
        upgradeCostMultiplier: 1,
        upgradeCost: [],
        unlockRequirements: []
      },
      {
        level: 2,
        nameKey: "goblin_hut.level.2.name",
        maxHiredGoblins: 3,
        unlockedClasses: ["miner", "builder"],
        hireCostMultiplier: 0.97,
        upgradeCostMultiplier: 0.97,
        upgradeCost: [
          { resourceId: "gold", amount: 240 },
          { resourceId: "stone", amount: 70 }
        ],
        unlockRequirements: [{ type: "mine_completed", mineTemplateId: "old_well_01" }]
      },
      {
        level: 3,
        nameKey: "goblin_hut.level.3.name",
        maxHiredGoblins: 5,
        unlockedClasses: ["miner", "builder", "collector"],
        hireCostMultiplier: 0.95,
        upgradeCostMultiplier: 0.93,
        upgradeCost: [
          { resourceId: "gold", amount: 850 },
          { resourceId: "stone", amount: 180 },
          { resourceId: "copper_ore", amount: 45 }
        ],
        unlockRequirements: [{ type: "built_mines_count", value: 1 }]
      },
      {
        level: 4,
        nameKey: "goblin_hut.level.4.name",
        maxHiredGoblins: 8,
        unlockedClasses: ["miner", "builder", "collector", "foreman"],
        hireCostMultiplier: 0.9,
        upgradeCostMultiplier: 0.88,
        upgradeCost: [
          { resourceId: "gold", amount: 2200 },
          { resourceId: "stone", amount: 360 },
          { resourceId: "copper_ore", amount: 110 },
          { resourceId: "iron", amount: 35 }
        ],
        unlockRequirements: [
          { type: "built_mines_count", value: 2 },
          { type: "mine_completed", mineTemplateId: "abandoned_crosscut_02" }
        ]
      }
    ]
  },
  elevator: {
    id: "default",
    nameKey: "elevator.name",
    levels: [
      {
        level: 1,
        nameKey: "elevator.level.1.name",
        dropDurationMs: 1450,
        offlineDamageMultiplier: 1,
        platformSlots: 2,
        stabilityPercent: 20,
        upgradeCost: [],
        visualStage: 1
      },
      {
        level: 2,
        nameKey: "elevator.level.2.name",
        dropDurationMs: 1320,
        offlineDamageMultiplier: 1.05,
        platformSlots: 3,
        stabilityPercent: 35,
        upgradeCost: [
          { resourceId: "gold", amount: 700 },
          { resourceId: "stone", amount: 120 }
        ],
        visualStage: 2
      },
      {
        level: 3,
        nameKey: "elevator.level.3.name",
        dropDurationMs: 1190,
        offlineDamageMultiplier: 1.1,
        platformSlots: 4,
        stabilityPercent: 50,
        upgradeCost: [
          { resourceId: "gold", amount: 1600 },
          { resourceId: "copper_ore", amount: 75 }
        ],
        visualStage: 3
      },
      {
        level: 4,
        nameKey: "elevator.level.4.name",
        dropDurationMs: 1060,
        offlineDamageMultiplier: 1.16,
        platformSlots: 5,
        stabilityPercent: 68,
        upgradeCost: [
          { resourceId: "gold", amount: 3200 },
          { resourceId: "copper_ore", amount: 160 },
          { resourceId: "iron", amount: 35 }
        ],
        visualStage: 4
      },
      {
        level: 5,
        nameKey: "elevator.level.5.name",
        dropDurationMs: 920,
        offlineDamageMultiplier: 1.25,
        platformSlots: 7,
        stabilityPercent: 85,
        upgradeCost: [
          { resourceId: "gold", amount: 6500 },
          { resourceId: "iron", amount: 120 },
          { resourceId: "elixir", amount: 20 }
        ],
        visualStage: 5
      }
    ]
  },
  localization: {
    ru: {
      "resource.gold.name": "Золото",
      "resource.stone.name": "Камень",
      "resource.copper_ore.name": "Медь",
      "resource.iron.name": "Железо",
      "resource.elixir.name": "Эликсир",
      "resource.boss_energy.name": "Энергия босса",
      "resource.boss_card_hit_damage.name": "Карта силы удара",
      "resource.boss_card_crit_chance.name": "Карта критического шанса",
      "resource.boss_card_crit_multiplier.name": "Золотая карта крита",
      "resource.boss_card_max_energy.name": "Карта запаса энергии",
      "block.dirt.name": "Земля",
      "block.stone.name": "Камень",
      "block.copper_ore.name": "Медь",
      "block.iron_ore.name": "Железо",
      "block.gold_cache.name": "Золото",
      "mine.old_well.name": "Старый колодец",
      "mine.abandoned_crosscut.name": "Заброшенный штрек",
      "mine.lower_gallery.name": "Нижняя галерея",
      "mine.sunken_works.name": "Затопленные выработки",
      "mine.red_iron_drop.name": "Красный железный спуск",
      "mine.black_rib.name": "Черное ребро",
      "mine.copper_stairs.name": "Медные ступени",
      "mine.golden_draft.name": "Золотой сквозняк",
      "mine.iron_throat.name": "Железное горло",
      "mine.cartel_root.name": "Корень картеля",
      "vein.gold_small.name": "Золотая жила",
      "vein.copper_small.name": "Медная жила",
      "vein.iron_small.name": "Железная жила",
      "built_mine.small_gold.name": "Малая золотая шахта",
      "built_mine.small_copper.name": "Малая медная шахта",
      "built_mine.small_iron.name": "Малая железная шахта",
      "reward_chest.wooden.name": "Деревянный сундук",
      "reward_chest.iron.name": "Железный сундук",
      "reward_chest.steel.name": "Стальной сундук",
      "goblin_generation.name": "Случайный найм гоблинов",
      "goblin_generation.random_miner_contract.name": "Контракт шахтера",
      "goblin_generation.random_collector_contract.name": "Контракт сборщика",
      "goblin_generation.random_foreman_contract.name": "Контракт бригадира",
      "goblin_trait.stone_focus.name": "Каменный фокус",
      "goblin_trait.ore_eye.name": "Рудный глаз",
      "goblin_trait.steady_hands.name": "Твердые руки",
      "goblin_trait.careful_pockets.name": "Осторожные карманы",
      "goblin_trait.long_list.name": "Длинная ведомость",
      "goblin_trait.quiet_count.name": "Тихий счет",
      "goblin_trait.sharp_whistle.name": "Резкий свисток",
      "goblin_trait.night_orders.name": "Ночные приказы",
      "goblin_trait.strict_shift.name": "Строгая смена",
      "goblin_hut.name": "Хижина гоблинов",
      "goblin_hut.level.1.name": "Шалаш кирок",
      "goblin_hut.level.2.name": "Навес бригады",
      "goblin_hut.level.3.name": "Складская хижина",
      "goblin_hut.level.4.name": "Большая артель",
      "elevator.name": "Подъемник",
      "elevator.level.1.name": "Скрипучая клеть",
      "elevator.level.2.name": "Усиленная клеть",
      "elevator.level.3.name": "Стальная платформа",
      "elevator.level.4.name": "Глубинный подъемник",
      "elevator.level.5.name": "Золотой механизм",
      "boss_card.hit_damage.name": "Сила удара",
      "boss_card.hit_damage.description": "Каждый уровень увеличивает урон босса за тап.",
      "boss_card.crit_chance.name": "Критический шанс",
      "boss_card.crit_chance.description": "Каждый уровень повышает шанс критического удара.",
      "boss_card.crit_multiplier.name": "Сила крита",
      "boss_card.crit_multiplier.description": "Каждый уровень увеличивает множитель критического удара.",
      "boss_card.max_energy.name": "Запас энергии",
      "boss_card.max_energy.description": "Каждый уровень увеличивает максимальную энергию босса.",
      "ability.stone_biter.name": "Камнегрыз",
      "ability.stone_biter.description": "Наносит больше урона каменным блокам.",
      "ability.cheap_shift.name": "Дешевая смена",
      "ability.cheap_shift.description": "Добавляет немного базового урона в начале игры.",
      "ability.copper_sniff.name": "Медный нюх",
      "ability.copper_sniff.description": "Лучше справляется с медными жилами.",
      "ability.slow_crusher.name": "Медленный дробитель",
      "ability.slow_crusher.description": "Бьет редко, но заметно сильнее.",
      "ability.first_scaffold.name": "Первый настил",
      "ability.first_scaffold.description": "Немного снижает стоимость раннего строительства.",
      "ability.tidy_planks.name": "Ровные доски",
      "ability.tidy_planks.description": "Снижает строительные расходы аккуратной сборкой.",
      "ability.boring_order.name": "Скучный порядок",
      "ability.boring_order.description": "Открывает первый слот авто-сбора и увеличивает вместимость назначенной шахты.",
      "ability.copper_tally.name": "Медная ведомость",
      "ability.copper_tally.description": "Открывает слот авто-сбора и усиливает добычу медной руды.",
      "ability.no_idle_picks.name": "Без простоев",
      "ability.no_idle_picks.description": "Переставляет шахтеров офлайн, держит темп добычи и выбивает немного больше ресурсов."
    }
  }
};

export function validateContentBundle(input: unknown): ContentValidationResult {
  const parsed = contentBundleSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "content"}: ${issue.message}`)
    };
  }

  const errors: string[] = [];
  collectDuplicateIds("resources", parsed.data.resources, errors);
  collectDuplicateIds("blockTypes", parsed.data.blockTypes, errors);
  collectDuplicateIds("veinTypes", parsed.data.veinTypes, errors);
  collectDuplicateIds("builtMineTypes", parsed.data.builtMineTypes, errors);
  collectDuplicateIds("rewardChestTypes", parsed.data.rewardChestTypes, errors);
  collectDuplicateIds("bossCards", parsed.data.bossCards, errors);
  collectDuplicateIds("mineTemplates", parsed.data.mineTemplates, errors);
  collectDuplicateIds("goblinGeneration.archetypes", parsed.data.goblinGeneration.archetypes, errors);

  const resourceIds = new Set(parsed.data.resources.map((resource) => resource.id));
  const blockTypeIds = new Set(parsed.data.blockTypes.map((blockType) => blockType.id));
  const veinTypeIds = new Set(parsed.data.veinTypes.map((veinType) => veinType.id));
  const rewardChestTypeIds = new Set(parsed.data.rewardChestTypes.map((rewardChestType) => rewardChestType.id));
  const mineTemplateIds = new Set(parsed.data.mineTemplates.map((mineTemplate) => mineTemplate.id));
  const ruLocalization = parsed.data.localization.ru;

  validateLocalizationText(parsed.data.localization, errors);

  for (const blockType of parsed.data.blockTypes) {
    validateLocalizationKey(blockType.nameKey, "ru", ruLocalization, errors);
    validateRewardTable(`blockTypes.${blockType.id}.rewardTable`, blockType.rewardTable, resourceIds, errors);
  }

  for (const rewardChestType of parsed.data.rewardChestTypes) {
    validateLocalizationKey(rewardChestType.nameKey, "ru", ruLocalization, errors);
    validateRewardTable(`rewardChestTypes.${rewardChestType.id}.rewardTable`, rewardChestType.rewardTable, resourceIds, errors);
  }

  for (const bossCard of parsed.data.bossCards) {
    validateLocalizationKey(bossCard.nameKey, "ru", ruLocalization, errors);
    validateLocalizationKey(bossCard.descriptionKey, "ru", ruLocalization, errors);

    if (!resourceIds.has(bossCard.cardResourceId)) {
      errors.push(`bossCards.${bossCard.id} references missing card resource ${bossCard.cardResourceId}`);
    }

    if (!resourceIds.has(bossCard.elixirResourceId)) {
      errors.push(`bossCards.${bossCard.id} references missing elixir resource ${bossCard.elixirResourceId}`);
    }
  }

  for (const mineTemplate of parsed.data.mineTemplates) {
    validateLocalizationKey(mineTemplate.displayNameKey, "ru", ruLocalization, errors);

    if (mineTemplate.completionRewardChestTypeId && !rewardChestTypeIds.has(mineTemplate.completionRewardChestTypeId)) {
      errors.push(
        `mineTemplates.${mineTemplate.id} references missing completion reward chest ${mineTemplate.completionRewardChestTypeId}`
      );
    }

    if (mineTemplate.completionVeinTypeId && !veinTypeIds.has(mineTemplate.completionVeinTypeId)) {
      errors.push(`mineTemplates.${mineTemplate.id} references missing completion vein type ${mineTemplate.completionVeinTypeId}`);
    }

    if (mineTemplate.depthProgressReward && !resourceIds.has(mineTemplate.depthProgressReward.resourceId)) {
      errors.push(
        `mineTemplates.${mineTemplate.id}.depthProgressReward references missing resource ${mineTemplate.depthProgressReward.resourceId}`
      );
    }

    const cellKeys = new Set<string>();

    for (const cell of mineTemplate.cellMap) {
      const cellPath = `mineTemplates.${mineTemplate.id}.cellMap.${cell.row}:${cell.col}`;
      const cellKey = `${cell.row}:${cell.col}`;

      if (cellKeys.has(cellKey)) {
        errors.push(`${cellPath} is duplicated`);
      }
      cellKeys.add(cellKey);

      if (cell.row >= mineTemplate.height || cell.col >= mineTemplate.width) {
        errors.push(`${cellPath} exceeds mine dimensions`);
      }

      if (!blockTypeIds.has(cell.blockTypeId)) {
        errors.push(`${cellPath} references missing block ${cell.blockTypeId}`);
      }

      if (cell.special === "reward_chest" && (!cell.rewardChestTypeId || !rewardChestTypeIds.has(cell.rewardChestTypeId))) {
        errors.push(`${cellPath} references missing reward chest type ${cell.rewardChestTypeId ?? ""}`.trim());
      }
    }

    for (let row = 0; row < mineTemplate.height; row += 1) {
      for (let col = 0; col < mineTemplate.width; col += 1) {
        if (!cellKeys.has(`${row}:${col}`)) {
          errors.push(`mineTemplates.${mineTemplate.id}.cellMap is missing cell ${row}:${col}`);
        }
      }
    }
  }

  for (const resource of parsed.data.resources) {
    validateLocalizationKey(resource.nameKey, "ru", ruLocalization, errors);
  }

  for (const veinType of parsed.data.veinTypes) {
    validateLocalizationKey(veinType.nameKey, "ru", ruLocalization, errors);

    if (!resourceIds.has(veinType.resourceId)) {
      errors.push(`veinTypes.${veinType.id} references missing resource ${veinType.resourceId}`);
    }
  }

  for (const builtMineType of parsed.data.builtMineTypes) {
    validateLocalizationKey(builtMineType.nameKey, "ru", ruLocalization, errors);
    validateResourceAmounts(`builtMineTypes.${builtMineType.id}.buildCost`, builtMineType.buildCost, resourceIds, errors);
    validateBuiltMineUpgradeCost(`builtMineTypes.${builtMineType.id}.upgrade.cost`, builtMineType.upgrade.cost, resourceIds, errors);

    if (!veinTypeIds.has(builtMineType.sourceVeinType)) {
      errors.push(`builtMineTypes.${builtMineType.id} references missing vein type ${builtMineType.sourceVeinType}`);
    }

    if (!resourceIds.has(builtMineType.productionResourceId)) {
      errors.push(`builtMineTypes.${builtMineType.id} references missing production resource ${builtMineType.productionResourceId}`);
    }
  }

  validateLocalizationKey(parsed.data.goblinHut.nameKey, "ru", ruLocalization, errors);
  validateGoblinHut(parsed.data.goblinHut, resourceIds, mineTemplateIds, ruLocalization, errors);
  validateLocalizationKey(parsed.data.elevator.nameKey, "ru", ruLocalization, errors);
  validateElevator(parsed.data.elevator, resourceIds, ruLocalization, errors);
  validateGoblinGeneration(parsed.data.goblinGeneration, resourceIds, ruLocalization, errors);

  return {
    ok: errors.length === 0,
    errors
  };
}

function validateGoblinHut(
  goblinHut: GoblinHutConfig,
  resourceIds: Set<string>,
  mineTemplateIds: Set<string>,
  ruLocalization: Record<string, string> | undefined,
  errors: string[]
) {
  const seenLevels = new Set<number>();
  let previousMaxHiredGoblins = 0;
  let previousUnlockedClasses = new Set<string>();

  for (const level of [...goblinHut.levels].sort((left, right) => left.level - right.level)) {
    if (seenLevels.has(level.level)) {
      errors.push(`goblinHut.levels has duplicate level ${level.level}`);
    }

    seenLevels.add(level.level);
    validateLocalizationKey(level.nameKey, "ru", ruLocalization, errors);
    validateResourceAmounts(`goblinHut.levels.${level.level}.upgradeCost`, level.upgradeCost, resourceIds, errors);
    validateUnlockRequirements(`goblinHut.levels.${level.level}.unlockRequirements`, level.unlockRequirements, resourceIds, mineTemplateIds, errors);

    if (level.level === 1 && (level.upgradeCost.length > 0 || level.unlockRequirements.length > 0)) {
      errors.push("goblinHut.levels.1 must be available without cost and requirements");
    }

    if (level.maxHiredGoblins < previousMaxHiredGoblins) {
      errors.push(`goblinHut.levels.${level.level}.maxHiredGoblins cannot be lower than previous level`);
    }

    for (const goblinClass of previousUnlockedClasses) {
      if (!level.unlockedClasses.includes(goblinClass as GoblinConfig["class"])) {
        errors.push(`goblinHut.levels.${level.level}.unlockedClasses cannot remove ${goblinClass}`);
      }
    }

    previousMaxHiredGoblins = level.maxHiredGoblins;
    previousUnlockedClasses = new Set(level.unlockedClasses);
  }

  const sortedLevels = [...seenLevels].sort((left, right) => left - right);

  for (let index = 0; index < sortedLevels.length; index += 1) {
    if (sortedLevels[index] !== index + 1) {
      errors.push("goblinHut.levels must start at 1 and be sequential");
      break;
    }
  }
}

function validateElevator(
  elevator: ElevatorConfig,
  resourceIds: Set<string>,
  ruLocalization: Record<string, string> | undefined,
  errors: string[]
) {
  const seenLevels = new Set<number>();
  let previousDropDurationMs = Number.POSITIVE_INFINITY;
  let previousOfflineDamageMultiplier = 1;
  let previousPlatformSlots = 0;
  let previousStabilityPercent = 0;

  for (const level of [...elevator.levels].sort((left, right) => left.level - right.level)) {
    if (seenLevels.has(level.level)) {
      errors.push(`elevator.levels has duplicate level ${level.level}`);
    }

    seenLevels.add(level.level);
    validateLocalizationKey(level.nameKey, "ru", ruLocalization, errors);
    validateResourceAmounts(`elevator.levels.${level.level}.upgradeCost`, level.upgradeCost, resourceIds, errors);

    if (level.level === 1 && level.upgradeCost.length > 0) {
      errors.push("elevator.levels.1 must be available without cost");
    }

    if (level.platformSlots < previousPlatformSlots) {
      errors.push(`elevator.levels.${level.level}.platformSlots cannot be lower than previous level`);
    }

    if (level.dropDurationMs > previousDropDurationMs) {
      errors.push(`elevator.levels.${level.level}.dropDurationMs cannot be higher than previous level`);
    }

    if (level.offlineDamageMultiplier < previousOfflineDamageMultiplier) {
      errors.push(`elevator.levels.${level.level}.offlineDamageMultiplier cannot be lower than previous level`);
    }

    if (level.stabilityPercent < previousStabilityPercent) {
      errors.push(`elevator.levels.${level.level}.stabilityPercent cannot be lower than previous level`);
    }

    previousDropDurationMs = level.dropDurationMs;
    previousOfflineDamageMultiplier = level.offlineDamageMultiplier;
    previousPlatformSlots = level.platformSlots;
    previousStabilityPercent = level.stabilityPercent;
  }

  const sortedLevels = [...seenLevels].sort((left, right) => left - right);

  for (let index = 0; index < sortedLevels.length; index += 1) {
    if (sortedLevels[index] !== index + 1) {
      errors.push("elevator.levels must start at 1 and be sequential");
      break;
    }
  }
}

function validateGoblinGeneration(
  goblinGeneration: GoblinGenerationConfig,
  resourceIds: Set<string>,
  ruLocalization: Record<string, string> | undefined,
  errors: string[]
) {
  validateLocalizationKey(goblinGeneration.nameKey, "ru", ruLocalization, errors);

  for (const archetype of goblinGeneration.archetypes) {
    const seenRarities = new Set<string>();
    const seenTraits = new Set<string>();
    const seenRenderKeys = new Set<string>();

    validateLocalizationKey(archetype.nameKey, "ru", ruLocalization, errors);
    validateResourceAmounts(`goblinGeneration.archetypes.${archetype.id}.hireCost`, archetype.hireCost, resourceIds, errors);
    if (archetype.ability) {
      validateLocalizationKey(archetype.ability.nameKey, "ru", ruLocalization, errors);
      validateLocalizationKey(archetype.ability.descriptionKey, "ru", ruLocalization, errors);
      validateGoblinAbilityEffects(`goblinGeneration.archetypes.${archetype.id}.ability.effects`, archetype.ability.effects, resourceIds, errors);
    } else {
      errors.push(`goblinGeneration.archetypes.${archetype.id}.ability is required`);
    }
    if (archetype.leveling) {
      validateGoblinLevelingCost(`goblinGeneration.archetypes.${archetype.id}.leveling.cost`, archetype.leveling.cost, resourceIds, errors);
    } else {
      errors.push(`goblinGeneration.archetypes.${archetype.id}.leveling is required`);
    }

    for (const rarityWeight of archetype.rarityWeights) {
      if (seenRarities.has(rarityWeight.rarity)) {
        errors.push(`goblinGeneration.archetypes.${archetype.id}.rarityWeights has duplicate rarity ${rarityWeight.rarity}`);
      }
      seenRarities.add(rarityWeight.rarity);
    }

    for (const trait of archetype.traitPool) {
      if (seenTraits.has(trait.id)) {
        errors.push(`goblinGeneration.archetypes.${archetype.id}.traitPool has duplicate trait ${trait.id}`);
      }
      seenTraits.add(trait.id);

      if (trait.nameKey) {
        validateLocalizationKey(trait.nameKey, "ru", ruLocalization, errors);
      }
    }

    for (const render of archetype.renderPool) {
      const renderKey = `${render.rarity ?? "any"}:${render.assetId}`;

      if (seenRenderKeys.has(renderKey)) {
        errors.push(`goblinGeneration.archetypes.${archetype.id}.renderPool has duplicate asset ${render.assetId}`);
      }

      seenRenderKeys.add(renderKey);
    }
  }
}

function validateBuiltMineUpgradeCost(
  path: string,
  cost: Array<{ resourceId?: string; useProductionResource?: boolean }>,
  resourceIds: Set<string>,
  errors: string[]
) {
  for (let index = 0; index < cost.length; index += 1) {
    const row = cost[index];

    if (row?.useProductionResource) {
      continue;
    }

    if (!row?.resourceId || !resourceIds.has(row.resourceId)) {
      errors.push(`${path}.${index} references missing resource ${row?.resourceId ?? ""}`.trim());
    }
  }
}

function validateGoblinLevelingCost(
  path: string,
  cost: Array<{ resourceId?: string }>,
  resourceIds: Set<string>,
  errors: string[]
) {
  for (let index = 0; index < cost.length; index += 1) {
    const row = cost[index];

    if (!row?.resourceId || !resourceIds.has(row.resourceId)) {
      errors.push(`${path}.${index} references missing resource ${row?.resourceId ?? ""}`.trim());
      continue;
    }

    if (row.resourceId !== "gold") {
      errors.push(`${path}.${index} must use gold`);
    }
  }
}

const suspiciousTextMarkers = [
  "\uFFFD",
  "\u00D0",
  "\u00D1",
  "\u0420\u00B0",
  "\u0420\u00B5",
  "\u0420\u00BB",
  "\u0420\u0455",
  "\u0420\u045C",
  "\u0420\u2014",
  "\u0421\u0403",
  "\u0421\u040A",
  "\u0421\u0152",
  "\u0421\u201A",
  "\u0421\u2039",
  "\u0421\u20AC"
];

function validateLocalizationText(localization: Record<string, Record<string, string>>, errors: string[]): void {
  for (const [locale, entries] of Object.entries(localization)) {
    for (const [key, value] of Object.entries(entries)) {
      if (hasSuspiciousBrokenText(value)) {
        errors.push(`localization.${locale}.${key} contains suspicious broken text`);
      }
    }
  }
}

function hasSuspiciousBrokenText(value: string): boolean {
  const trimmed = value.trim();

  if (/\?{3,}/u.test(trimmed)) {
    return true;
  }

  return suspiciousTextMarkers.some((marker) => trimmed.includes(marker));
}

function validateLocalizationKey(
  key: string,
  locale: string,
  localization: Record<string, string> | undefined,
  errors: string[]
): void {
  if (!localization) {
    return;
  }

  if (!localization[key]) {
    errors.push(`localization.${locale} is missing key ${key}`);
  }
}

function validateResourceAmounts(
  owner: string,
  amounts: Array<{ resourceId: string }>,
  resourceIds: Set<string>,
  errors: string[]
): void {
  for (const amount of amounts) {
    if (!resourceIds.has(amount.resourceId)) {
      errors.push(`${owner} references missing resource ${amount.resourceId}`);
    }
  }
}

function validateRewardTable(
  owner: string,
  rewardTable: Array<{ resourceId: string; min: number; max: number }>,
  resourceIds: Set<string>,
  errors: string[]
): void {
  for (const reward of rewardTable) {
    if (!resourceIds.has(reward.resourceId)) {
      errors.push(`${owner} references missing resource ${reward.resourceId}`);
    }

    if (reward.min > reward.max) {
      errors.push(`${owner} has min greater than max for ${reward.resourceId}`);
    }
  }
}

function validateUnlockRequirements(
  owner: string,
  requirements: Array<
    | { type: "built_mines_count"; value: number }
    | { type: "mine_completed"; mineTemplateId: string }
    | { type: "goblins_by_class"; class: string; count: number }
    | { type: "resource_collected"; resourceId: string; amount: number }
  >,
  resourceIds: Set<string>,
  mineTemplateIds: Set<string>,
  errors: string[]
): void {
  for (const requirement of requirements) {
    if (requirement.type === "resource_collected" && !resourceIds.has(requirement.resourceId)) {
      errors.push(`${owner} references missing resource ${requirement.resourceId}`);
    }

    if (requirement.type === "mine_completed" && !mineTemplateIds.has(requirement.mineTemplateId)) {
      errors.push(`${owner} references missing mine template ${requirement.mineTemplateId}`);
    }
  }
}

function validateGoblinAbilityEffects(
  owner: string,
  effects: Array<{ type: string; resourceId?: string }>,
  resourceIds: Set<string>,
  errors: string[]
): void {
  for (const effect of effects) {
    if (effect.type === "mine_production_multiplier" && effect.resourceId && !resourceIds.has(effect.resourceId)) {
      errors.push(`${owner} references missing resource ${effect.resourceId}`);
    }
  }
}

function collectDuplicateIds(collectionName: string, items: Array<{ id: string }>, errors: string[]): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`${collectionName} has duplicate id ${item.id}`);
    }

    seen.add(item.id);
  }
}
