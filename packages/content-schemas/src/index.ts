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

export const goblinRoleSchema = z.enum(["miner", "collector", "foreman"]);
export const goblinPrimaryStatSchema = z.enum(["power", "speed", "control"]);
export const goblinStarRankSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]);

export const defaultGoblinSkin = {
  buttons: {
    disabled: "ui_hire_button_disabled_v1",
    hover: "ui_hire_button_hover_v1",
    normal: "ui_hire_button_normal_v1",
    pressed: "ui_hire_button_pressed_v1"
  },
  cardBase: "ui_hire_card_base_common_v1",
  detailsModalBackground: "",
  ownedCards: {
    base: "ui_owned_goblin_card_base_v1",
    starIcon: "",
    upgradeArrow: "ui_owned_goblin_upgrade_arrow_v1"
  },
  resourceChipFrame: "ui_resource_chip_frame_v1",
  screenBackground: "ui_goblin_screen_pattern_v1",
  titlePlate: "ui_hire_title_plate_v1"
} as const;

export const goblinSkinSchema = z
  .object({
    cardBase: z.string().min(1),
    detailsModalBackground: z.string().default(""),
    buttons: z
      .object({
        normal: z.string().min(1),
        hover: z.string().min(1),
        pressed: z.string().min(1),
        disabled: z.string().min(1)
      })
      .strict(),
    ownedCards: z
      .object({
        base: z.string().min(1),
        starIcon: z.string().default(""),
        upgradeArrow: z.string().min(1)
      })
      .strict()
      .default(defaultGoblinSkin.ownedCards),
    resourceChipFrame: z.string().min(1).default(defaultGoblinSkin.resourceChipFrame),
    screenBackground: z.string().min(1).default(defaultGoblinSkin.screenBackground),
    titlePlate: z.string().min(1).default(defaultGoblinSkin.titlePlate)
  })
  .strict();

export const defaultUiIcons = {
  controls: {
    settingsButtonFrame: "ui_settings_button_frame_v1",
    settingsIcon: "ui_settings_gear_v1"
  },
  id: "default",
  resources: {
    boss_card_crit_chance: "icon_boss_card_crit_chance_v1",
    boss_card_crit_multiplier: "icon_boss_card_crit_multiplier_v1",
    boss_card_hit_damage: "icon_boss_card_hit_damage_v1",
    boss_card_max_energy: "icon_boss_card_max_energy_v1",
    boss_energy: "icon_boss_energy_v1",
    copper_ore: "icon_copper_ore_v1",
    elixir: "icon_elixir_v1",
    gold: "icon_gold_v1",
    iron: "icon_iron_v1",
    stone: "icon_stone_v1"
  },
  stats: {
    control: "ui_icon_clock_v1",
    power: "ui_icon_pickaxe_v1",
    speed: "ui_icon_boot_v1"
  }
} as const;

export const uiIconsSchema = z
  .object({
    controls: z
      .object({
        settingsButtonFrame: z.string().min(1),
        settingsIcon: z.string().min(1)
      })
      .strict()
      .default(defaultUiIcons.controls),
    id: z.literal("default").default("default"),
    resources: z.record(z.string().min(1), z.string().min(1)).default(defaultUiIcons.resources),
    stats: z
      .object({
        control: z.string().min(1),
        power: z.string().min(1),
        speed: z.string().min(1)
      })
      .strict()
      .default(defaultUiIcons.stats)
  })
  .strict();

export const goblinModifierSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stat_bonus"),
    stat: goblinPrimaryStatSchema,
    value: z.number().int().nonnegative()
  }),
  z.object({
    type: z.literal("stat_multiplier"),
    stat: goblinPrimaryStatSchema,
    value: z.number().positive()
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
    type: z.literal("offline_auto_damage_multiplier"),
    value: z.number().positive()
  }),
  z.object({
    type: z.literal("offline_reward_multiplier"),
    value: z.number().positive()
  })
]);

export const goblinProgressionStarSchema = z
  .object({
    stars: goblinStarRankSchema,
    statValue: z.number().int().positive(),
    upgradeCost: z.array(resourceAmountSchema).default([]),
    modifiers: z.array(goblinModifierSchema).default([])
  })
  .strict();

export const goblinProgressionLevelSchema = z
  .object({
    level: z.number().int().positive(),
    stars: z.array(goblinProgressionStarSchema).length(6)
  })
  .strict();

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
    type: z.literal("goblins_by_role"),
    role: goblinRoleSchema,
    count: z.number().int().positive()
  }),
  z.object({
    type: z.literal("resource_collected"),
    resourceId: z.string().min(1),
    amount: z.number().int().positive()
  })
]);

export const goblinRoleConfigSchema = z
  .object({
    id: z.string().min(1),
    role: goblinRoleSchema,
    nameKey: z.string().min(1),
    descriptionKey: z.string().min(1),
    statKey: goblinPrimaryStatSchema,
    statNameKey: z.string().min(1),
    assetId: z.string().min(1),
    hireAssetId: z.string().min(1).optional(),
    detailsAssetId: z.string().min(1).optional(),
    hireCost: z.array(resourceAmountSchema).default([]),
    levels: z.array(goblinProgressionLevelSchema).min(1),
    unlockRequirements: z.array(goblinUnlockRequirementSchema).default([]),
    sortOrder: z.number().int().default(0)
  })
  .strict();

export const goblinsSchema = z
  .object({
    id: z.literal("default").default("default"),
    nameKey: z.string().min(1),
    skin: goblinSkinSchema.default(defaultGoblinSkin),
    roles: z.array(goblinRoleConfigSchema).length(3)
  })
  .strict();

export const goblinHutLevelSchema = z.object({
  level: z.number().int().positive(),
  nameKey: z.string().min(1),
  maxHiredGoblins: z.number().int().positive(),
  unlockedRoles: z.array(goblinRoleSchema).min(1),
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

export const goblinSchema = goblinRoleConfigSchema;

export const localizationSchema = z.record(z.string().min(2), z.record(z.string().min(1), z.string().min(1)));

export const contentBundleSchema = z
  .object({
    resources: z.array(resourceSchema).min(1),
    blockTypes: z.array(blockTypeSchema).min(1),
    veinTypes: z.array(veinTypeSchema),
    builtMineTypes: z.array(builtMineTypeSchema),
    rewardChestTypes: z.array(rewardChestTypeSchema),
    bossCards: z.array(bossCardSchema),
    mineTemplates: z.array(mineTemplateSchema).min(1),
    uiIcons: uiIconsSchema.default(defaultUiIcons),
    goblins: goblinsSchema,
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
export type GoblinsConfig = z.infer<typeof goblinsSchema>;
export type GoblinRoleConfig = z.infer<typeof goblinRoleConfigSchema>;
export type GoblinRole = z.infer<typeof goblinRoleSchema>;
export type GoblinPrimaryStat = z.infer<typeof goblinPrimaryStatSchema>;
export type GoblinStarRank = z.infer<typeof goblinStarRankSchema>;
export type UiIconsConfig = z.infer<typeof uiIconsSchema>;
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

export interface ContentValidationResult {
  ok: boolean;
  errors: string[];
}

function createStarterGoblinLevels(
  levelStats: Array<[number, number, number, number, number, number]>,
  costBaseAmount: number
): GoblinRoleConfig["levels"] {
  return levelStats.map((statValues, levelIndex) => ({
    level: levelIndex + 1,
    stars: statValues.map((statValue, starIndex) => {
      const isLevelPromotionTier = starIndex === 5 && levelIndex < levelStats.length - 1;
      return {
        stars: starIndex as GoblinStarRank,
        statValue,
        upgradeCost: isLevelPromotionTier
          ? [
              {
                resourceId: "gold",
                amount: Math.round(costBaseAmount * (levelIndex + 1) ** 2)
              }
            ]
          : [],
        modifiers: []
      };
    })
  }));
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
  uiIcons: defaultUiIcons,
  goblins: {
    id: "default",
    nameKey: "goblins.name",
    skin: defaultGoblinSkin,
    roles: [
      {
        id: "miner",
        role: "miner",
        nameKey: "goblin.miner.name",
        descriptionKey: "goblin.miner.description",
        statKey: "power",
        statNameKey: "goblin.stat.power",
        assetId: "goblin_owned_miner_v1",
        hireAssetId: "goblin_hire_miner_v1",
        detailsAssetId: "goblin_details_miner_v1",
        hireCost: [],
        levels: createStarterGoblinLevels(
          [
            [5, 6, 7, 8, 9, 10],
            [12, 14, 16, 18, 20, 22],
            [26, 29, 32, 35, 38, 42]
          ],
          100
        ),
        unlockRequirements: [],
        sortOrder: 10
      },
      {
        id: "collector",
        role: "collector",
        nameKey: "goblin.collector.name",
        descriptionKey: "goblin.collector.description",
        statKey: "speed",
        statNameKey: "goblin.stat.speed",
        assetId: "goblin_owned_collector_v1",
        hireAssetId: "goblin_hire_collector_v1",
        detailsAssetId: "goblin_details_collector_v1",
        hireCost: [{ resourceId: "gold", amount: 300 }],
        levels: createStarterGoblinLevels(
          [
            [5, 6, 7, 8, 9, 10],
            [12, 14, 16, 18, 20, 22],
            [26, 29, 32, 35, 38, 42]
          ],
          140
        ),
        unlockRequirements: [{ type: "built_mines_count", value: 1 }],
        sortOrder: 20
      },
      {
        id: "foreman",
        role: "foreman",
        nameKey: "goblin.foreman.name",
        descriptionKey: "goblin.foreman.description",
        statKey: "control",
        statNameKey: "goblin.stat.control",
        assetId: "goblin_owned_foreman_v1",
        hireAssetId: "goblin_hire_foreman_v1",
        detailsAssetId: "goblin_details_foreman_v1",
        hireCost: [{ resourceId: "gold", amount: 900 }],
        levels: createStarterGoblinLevels(
          [
            [5, 6, 7, 8, 9, 10],
            [12, 14, 16, 18, 20, 22],
            [26, 29, 32, 35, 38, 42]
          ],
          180
        ),
        unlockRequirements: [{ type: "mine_completed", mineTemplateId: "abandoned_crosscut_02" }],
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
        unlockedRoles: ["miner"],
        hireCostMultiplier: 1,
        upgradeCostMultiplier: 1,
        upgradeCost: [],
        unlockRequirements: []
      },
      {
        level: 2,
        nameKey: "goblin_hut.level.2.name",
        maxHiredGoblins: 3,
        unlockedRoles: ["miner", "collector"],
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
        unlockedRoles: ["miner", "collector"],
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
        unlockedRoles: ["miner", "collector", "foreman"],
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
      "goblins.name": "Гоблины",
      "goblin.miner.name": "Шахтер",
      "goblin.miner.description": "Долбит камни на платформе. Сила напрямую задает урон в секунду.",
      "goblin.collector.name": "Сборщик",
      "goblin.collector.description": "Автоматизирует шахту и увеличивает ее добычу в час на процент скорости.",
      "goblin.foreman.name": "Бригадир",
      "goblin.foreman.description": "В офлайне переставляет шахтеров на новые камни. Контроль задает число перестановок.",
      "goblin.stat.power": "Сила",
      "goblin.stat.speed": "Скорость",
      "goblin.stat.control": "Контроль",
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
  collectDuplicateIds("goblins.roles", parsed.data.goblins.roles, errors);

  const resourceIds = new Set(parsed.data.resources.map((resource) => resource.id));
  const blockTypeIds = new Set(parsed.data.blockTypes.map((blockType) => blockType.id));
  const veinTypeIds = new Set(parsed.data.veinTypes.map((veinType) => veinType.id));
  const rewardChestTypeIds = new Set(parsed.data.rewardChestTypes.map((rewardChestType) => rewardChestType.id));
  const mineTemplateIds = new Set(parsed.data.mineTemplates.map((mineTemplate) => mineTemplate.id));
  const ruLocalization = parsed.data.localization.ru;

  if (!ruLocalization) {
    errors.push("localization.ru is required");
  }

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
  validateGoblins(parsed.data.goblins, resourceIds, mineTemplateIds, ruLocalization, errors);

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
  let previousUnlockedRoles = new Set<string>();

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

    for (const goblinRole of previousUnlockedRoles) {
      if (!level.unlockedRoles.includes(goblinRole as GoblinRole)) {
        errors.push(`goblinHut.levels.${level.level}.unlockedRoles cannot remove ${goblinRole}`);
      }
    }

    previousMaxHiredGoblins = level.maxHiredGoblins;
    previousUnlockedRoles = new Set(level.unlockedRoles);
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

function validateGoblins(
  goblins: GoblinsConfig,
  resourceIds: Set<string>,
  mineTemplateIds: Set<string>,
  ruLocalization: Record<string, string> | undefined,
  errors: string[]
) {
  const expectedStats: Record<GoblinRole, GoblinPrimaryStat> = {
    collector: "speed",
    foreman: "control",
    miner: "power"
  };
  const seenRoles = new Set<GoblinRole>();

  validateLocalizationKey(goblins.nameKey, "ru", ruLocalization, errors);

  for (const goblin of goblins.roles) {
    if (goblin.id !== goblin.role) {
      errors.push(`goblins.roles.${goblin.id}.id must match role`);
    }

    if (seenRoles.has(goblin.role)) {
      errors.push(`goblins.roles has duplicate role ${goblin.role}`);
    }

    seenRoles.add(goblin.role);
    validateLocalizationKey(goblin.nameKey, "ru", ruLocalization, errors);
    validateLocalizationKey(goblin.descriptionKey, "ru", ruLocalization, errors);
    validateLocalizationKey(goblin.statNameKey, "ru", ruLocalization, errors);
    validateGoldResourceAmounts(`goblins.roles.${goblin.id}.hireCost`, goblin.hireCost, resourceIds, errors);
    validateUnlockRequirements(`goblins.roles.${goblin.id}.unlockRequirements`, goblin.unlockRequirements, resourceIds, mineTemplateIds, errors);
    validateGoblinVisualAssetIds(goblin, errors);

    if (goblin.statKey !== expectedStats[goblin.role]) {
      errors.push(`goblins.roles.${goblin.id}.statKey must be ${expectedStats[goblin.role]}`);
    }

    validateGoblinProgression(goblin, resourceIds, errors);
  }

  for (const role of Object.keys(expectedStats) as GoblinRole[]) {
    if (!seenRoles.has(role)) {
      errors.push(`goblins.roles is missing ${role}`);
    }
  }
}

function validateGoblinVisualAssetIds(goblin: GoblinRoleConfig, errors: string[]): void {
  const visualAssetIds = [goblin.assetId, goblin.hireAssetId, goblin.detailsAssetId].filter(
    (assetId): assetId is string => typeof assetId === "string" && assetId.trim().length > 0
  );

  if (visualAssetIds.length !== 3) {
    errors.push(`goblins.roles.${goblin.id} must define assetId, hireAssetId and detailsAssetId`);
    return;
  }

  if (new Set(visualAssetIds).size !== visualAssetIds.length) {
    errors.push(`goblins.roles.${goblin.id} assetId, hireAssetId and detailsAssetId must be different`);
  }
}

function validateGoblinProgression(goblin: GoblinRoleConfig, resourceIds: Set<string>, errors: string[]): void {
  const sortedLevels = [...goblin.levels].sort((left, right) => left.level - right.level);

  for (let index = 0; index < sortedLevels.length; index += 1) {
    const level = sortedLevels[index];
    const expectedLevel = index + 1;

    if (!level) {
      continue;
    }

    if (level.level !== expectedLevel) {
      errors.push(`goblins.roles.${goblin.id}.levels must start at 1 and be sequential`);
      break;
    }

    const seenStars = new Set<number>();

    for (const star of level.stars) {
      if (seenStars.has(star.stars)) {
        errors.push(`goblins.roles.${goblin.id}.levels.${level.level}.stars has duplicate rank ${star.stars}`);
      }

      seenStars.add(star.stars);
      validateGoldResourceAmounts(
        `goblins.roles.${goblin.id}.levels.${level.level}.stars.${star.stars}.upgradeCost`,
        star.upgradeCost,
        resourceIds,
        errors
      );
      if (star.stars < 5 && star.upgradeCost.length > 0) {
        errors.push(`goblins.roles.${goblin.id}.levels.${level.level}.stars.${star.stars}.upgradeCost must be empty because stars are merged`);
      }

      for (const modifier of star.modifiers) {
        if (modifier.type === "mine_production_multiplier" && modifier.resourceId && !resourceIds.has(modifier.resourceId)) {
          errors.push(
            `goblins.roles.${goblin.id}.levels.${level.level}.stars.${star.stars}.modifiers references missing resource ${modifier.resourceId}`
          );
        }
      }
    }

    for (let rank = 0; rank <= 5; rank += 1) {
      if (!seenStars.has(rank)) {
        errors.push(`goblins.roles.${goblin.id}.levels.${level.level}.stars is missing rank ${rank}`);
      }
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

function validateGoldResourceAmounts(
  path: string,
  amounts: Array<{ resourceId: string }>,
  resourceIds: Set<string>,
  errors: string[]
): void {
  validateResourceAmounts(path, amounts, resourceIds, errors);

  for (let index = 0; index < amounts.length; index += 1) {
    const amount = amounts[index];

    if (amount && resourceIds.has(amount.resourceId) && amount.resourceId !== "gold") {
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
    errors.push(`localization.${locale} is required for key ${key}`);
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
    | { type: "goblins_by_role"; role: GoblinRole; count: number }
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

function collectDuplicateIds(collectionName: string, items: Array<{ id: string }>, errors: string[]): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`${collectionName} has duplicate id ${item.id}`);
    }

    seen.add(item.id);
  }
}
