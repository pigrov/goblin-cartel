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

export const goblinBaseStatsSchema = z.object({
  strength: z.number().int().nonnegative(),
  speed: z.number().int().nonnegative(),
  luck: z.number().int().nonnegative(),
  loyalty: z.number().int().nonnegative()
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
    type: z.literal("auto_select_next_block"),
    enabled: z.boolean().default(true)
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

export const resourceSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  iconAssetId: z.string().min(1),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  storageType: z.enum(["global", "per_mine", "temporary"]).default("global"),
  sortOrder: z.number().int()
});

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
  specialBehavior: z.enum(["none", "explosion", "chest"]).default("none")
});

export const mineTemplateSchema = z.object({
  id: z.string().min(1),
  displayNameKey: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  depthMeters: z.number().int().positive(),
  difficulty: z.number().positive(),
  seedMode: z.enum(["fixed", "random", "playerBased"]),
  strata: z.array(
    z.object({
      id: z.string().min(1),
      fromRow: z.number().int().nonnegative(),
      toRow: z.number().int().nonnegative(),
      blockWeights: z.record(z.string().min(1), z.number().positive())
    })
  )
});

export const goblinSchema = z.object({
  id: z.string().min(1),
  nameKey: z.string().min(1),
  descriptionKey: z.string().min(1),
  class: goblinClassSchema,
  clan: goblinClanSchema.default("neutral"),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).default("common"),
  assetId: z.string().min(1),
  baseStats: goblinBaseStatsSchema,
  ability: goblinAbilitySchema,
  hireCost: z.array(resourceAmountSchema).default([]),
  unlockRequirements: z.array(goblinUnlockRequirementSchema).default([]),
  sortOrder: z.number().int()
});

export const localizationSchema = z.record(z.string().min(2), z.record(z.string().min(1), z.string().min(1))).default({});

export const contentBundleSchema = z
  .object({
    resources: z.array(resourceSchema).min(1),
    blockTypes: z.array(blockTypeSchema).min(1),
    mineTemplates: z.array(mineTemplateSchema).min(1),
    goblins: z.array(goblinSchema).default([]),
    localization: localizationSchema
  })
  .strict();

export type ResourceConfig = z.infer<typeof resourceSchema>;
export type BlockTypeConfig = z.infer<typeof blockTypeSchema>;
export type MineTemplateConfig = z.infer<typeof mineTemplateSchema>;
export type GoblinConfig = z.infer<typeof goblinSchema>;
export type LocalizationConfig = z.infer<typeof localizationSchema>;
export type ContentBundle = z.infer<typeof contentBundleSchema>;

export interface ContentValidationResult {
  ok: boolean;
  errors: string[];
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
      id: "boss_energy",
      nameKey: "resource.boss_energy.name",
      iconAssetId: "icon_boss_energy_v1",
      rarity: "rare",
      storageType: "temporary",
      sortOrder: 40
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
        { resourceId: "gold", min: 1, max: 5, chance: 0.05 }
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
      rewardTable: [{ resourceId: "stone", min: 3, max: 8, chance: 1 }],
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
        { resourceId: "gold", min: 5, max: 15, chance: 0.1 }
      ],
      specialBehavior: "none"
    },
    {
      id: "chest_wooden",
      nameKey: "block.chest_wooden.name",
      baseHp: 40,
      tags: ["chest"],
      visualStateAssets: {
        intact: "block_chest_wooden_intact_v1",
        cracked: "block_chest_wooden_cracked_v1",
        breaking: "block_chest_wooden_breaking_v1"
      },
      rewardTable: [
        { resourceId: "gold", min: 25, max: 80, chance: 1 },
        { resourceId: "boss_energy", min: 5, max: 15, chance: 0.75 }
      ],
      specialBehavior: "chest"
    }
  ],
  mineTemplates: [
    {
      id: "old_well_01",
      displayNameKey: "mine.old_well.name",
      width: 8,
      height: 40,
      depthMeters: 200,
      difficulty: 1,
      seedMode: "playerBased",
      strata: [
        {
          id: "top_soil",
          fromRow: 0,
          toRow: 7,
          blockWeights: {
            dirt: 70,
            stone: 25,
            chest_wooden: 5
          }
        },
        {
          id: "stone_layer",
          fromRow: 8,
          toRow: 23,
          blockWeights: {
            dirt: 20,
            stone: 60,
            copper_ore: 15,
            chest_wooden: 5
          }
        },
        {
          id: "copper_layer",
          fromRow: 24,
          toRow: 39,
          blockWeights: {
            stone: 55,
            copper_ore: 40,
            chest_wooden: 5
          }
        }
      ]
    }
  ],
  goblins: [
    {
      id: "gryzz_crooked_tooth",
      nameKey: "goblin.gryzz.name",
      descriptionKey: "goblin.gryzz.description",
      class: "miner",
      clan: "rusty_picks",
      rarity: "common",
      assetId: "goblin_gryzz_v1",
      baseStats: {
        strength: 8,
        speed: 5,
        luck: 2,
        loyalty: 5
      },
      ability: {
        id: "stone_biter",
        nameKey: "ability.stone_biter.name",
        descriptionKey: "ability.stone_biter.description",
        effects: [{ type: "damage_bonus_by_tag", tag: "rock", value: 0.2 }]
      },
      hireCost: [],
      unlockRequirements: [],
      sortOrder: 10
    },
    {
      id: "myk_dull_pickaxe",
      nameKey: "goblin.myk.name",
      descriptionKey: "goblin.myk.description",
      class: "miner",
      clan: "rusty_picks",
      rarity: "common",
      assetId: "goblin_myk_v1",
      baseStats: {
        strength: 5,
        speed: 6,
        luck: 1,
        loyalty: 4
      },
      ability: {
        id: "cheap_shift",
        nameKey: "ability.cheap_shift.name",
        descriptionKey: "ability.cheap_shift.description",
        effects: [{ type: "base_damage_bonus", value: 2 }]
      },
      hireCost: [{ resourceId: "gold", amount: 150 }],
      unlockRequirements: [],
      sortOrder: 20
    },
    {
      id: "skrapp_copper_nose",
      nameKey: "goblin.skrapp.name",
      descriptionKey: "goblin.skrapp.description",
      class: "miner",
      clan: "rusty_picks",
      rarity: "common",
      assetId: "goblin_skrapp_v1",
      baseStats: {
        strength: 6,
        speed: 5,
        luck: 3,
        loyalty: 5
      },
      ability: {
        id: "copper_sniff",
        nameKey: "ability.copper_sniff.name",
        descriptionKey: "ability.copper_sniff.description",
        effects: [{ type: "damage_bonus_by_tag", tag: "copper", value: 0.25 }]
      },
      hireCost: [
        { resourceId: "gold", amount: 350 },
        { resourceId: "stone", amount: 40 }
      ],
      unlockRequirements: [{ type: "resource_collected", resourceId: "copper_ore", amount: 25 }],
      sortOrder: 30
    },
    {
      id: "rumm_heavy_paw",
      nameKey: "goblin.rumm.name",
      descriptionKey: "goblin.rumm.description",
      class: "miner",
      clan: "rusty_picks",
      rarity: "rare",
      assetId: "goblin_rumm_v1",
      baseStats: {
        strength: 12,
        speed: 2,
        luck: 1,
        loyalty: 5
      },
      ability: {
        id: "slow_crusher",
        nameKey: "ability.slow_crusher.name",
        descriptionKey: "ability.slow_crusher.description",
        effects: [{ type: "base_damage_bonus", value: 6 }]
      },
      hireCost: [
        { resourceId: "gold", amount: 900 },
        { resourceId: "stone", amount: 180 }
      ],
      unlockRequirements: [{ type: "resource_collected", resourceId: "stone", amount: 300 }],
      sortOrder: 40
    },
    {
      id: "brikk_hammer",
      nameKey: "goblin.brikk.name",
      descriptionKey: "goblin.brikk.description",
      class: "builder",
      clan: "bolt_skulls",
      rarity: "common",
      assetId: "goblin_brikk_v1",
      baseStats: {
        strength: 4,
        speed: 4,
        luck: 2,
        loyalty: 6
      },
      ability: {
        id: "first_scaffold",
        nameKey: "ability.first_scaffold.name",
        descriptionKey: "ability.first_scaffold.description",
        effects: [{ type: "build_cost_multiplier", value: 0.95 }]
      },
      hireCost: [
        { resourceId: "gold", amount: 500 },
        { resourceId: "stone", amount: 120 }
      ],
      unlockRequirements: [{ type: "resource_collected", resourceId: "stone", amount: 150 }],
      sortOrder: 50
    },
    {
      id: "tikk_straight_board",
      nameKey: "goblin.tikk.name",
      descriptionKey: "goblin.tikk.description",
      class: "builder",
      clan: "bolt_skulls",
      rarity: "common",
      assetId: "goblin_tikk_v1",
      baseStats: {
        strength: 3,
        speed: 5,
        luck: 3,
        loyalty: 7
      },
      ability: {
        id: "tidy_planks",
        nameKey: "ability.tidy_planks.name",
        descriptionKey: "ability.tidy_planks.description",
        effects: [{ type: "build_cost_multiplier", value: 0.9 }]
      },
      hireCost: [
        { resourceId: "gold", amount: 700 },
        { resourceId: "stone", amount: 160 }
      ],
      unlockRequirements: [{ type: "built_mines_count", value: 1 }],
      sortOrder: 60
    },
    {
      id: "pip_dry_book",
      nameKey: "goblin.pip.name",
      descriptionKey: "goblin.pip.description",
      class: "collector",
      clan: "black_pockets",
      rarity: "rare",
      assetId: "goblin_pip_v1",
      baseStats: {
        strength: 2,
        speed: 4,
        luck: 7,
        loyalty: 8
      },
      ability: {
        id: "boring_order",
        nameKey: "ability.boring_order.name",
        descriptionKey: "ability.boring_order.description",
        effects: [{ type: "auto_collect_slots", value: 1 }]
      },
      hireCost: [
        { resourceId: "gold", amount: 2500 },
        { resourceId: "copper_ore", amount: 100 }
      ],
      unlockRequirements: [{ type: "built_mines_count", value: 2 }],
      sortOrder: 70
    },
    {
      id: "krakk_iron_turnip",
      nameKey: "goblin.krakk.name",
      descriptionKey: "goblin.krakk.description",
      class: "foreman",
      clan: "rusty_picks",
      rarity: "rare",
      assetId: "goblin_krakk_v1",
      baseStats: {
        strength: 6,
        speed: 6,
        luck: 3,
        loyalty: 8
      },
      ability: {
        id: "no_idle_picks",
        nameKey: "ability.no_idle_picks.name",
        descriptionKey: "ability.no_idle_picks.description",
        effects: [{ type: "auto_select_next_block", enabled: true }]
      },
      hireCost: [
        { resourceId: "gold", amount: 4000 },
        { resourceId: "copper_ore", amount: 180 }
      ],
      unlockRequirements: [{ type: "goblins_by_class", class: "miner", count: 3 }],
      sortOrder: 80
    }
  ],
  localization: {
    ru: {
      "resource.gold.name": "Золото",
      "resource.stone.name": "Камень",
      "resource.copper_ore.name": "Медная руда",
      "resource.boss_energy.name": "Энергия босса",
      "block.dirt.name": "Земля",
      "block.stone.name": "Камень",
      "block.copper_ore.name": "Медная руда",
      "block.chest_wooden.name": "Деревянный сундук",
      "mine.old_well.name": "Старый колодец",
      "goblin.gryzz.name": "Грызз Кривозуб",
      "goblin.gryzz.description": "Долбит камни так уверенно, будто камни ему должны.",
      "goblin.myk.name": "Мык Тупая Кирка",
      "goblin.myk.description": "Дешевый рабочий, который спорит только с инструкцией.",
      "goblin.skrapp.name": "Скрапп Медный Нос",
      "goblin.skrapp.description": "Чует медь раньше, чем начальство чует прибыль.",
      "goblin.rumm.name": "Румм Тяжелая Лапа",
      "goblin.rumm.description": "Медленный удар, зато камень потом долго молчит.",
      "goblin.brikk.name": "Брикк Молоток",
      "goblin.brikk.description": "Строит быстро, ругается по чертежу.",
      "goblin.tikk.name": "Тикк Ровная Доска",
      "goblin.tikk.description": "Экономит доски так, будто они родня.",
      "goblin.pip.name": "Пип Сухая Книга",
      "goblin.pip.description": "Собирает доход без лишних слов и почти без потерь.",
      "goblin.krakk.name": "Кракк Железная Репа",
      "goblin.krakk.description": "Держит смену в движении одним тяжелым взглядом.",
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
      "ability.boring_order.description": "Открывает первый слот авто-сбора.",
      "ability.no_idle_picks.name": "Без простоев",
      "ability.no_idle_picks.description": "Гоблины сами переходят к следующему блоку."
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
  collectDuplicateIds("mineTemplates", parsed.data.mineTemplates, errors);
  collectDuplicateIds("goblins", parsed.data.goblins, errors);

  const resourceIds = new Set(parsed.data.resources.map((resource) => resource.id));
  const blockTypeIds = new Set(parsed.data.blockTypes.map((blockType) => blockType.id));
  const mineTemplateIds = new Set(parsed.data.mineTemplates.map((mineTemplate) => mineTemplate.id));
  const ruLocalization = parsed.data.localization.ru;

  for (const blockType of parsed.data.blockTypes) {
    validateLocalizationKey(blockType.nameKey, "ru", ruLocalization, errors);

    for (const reward of blockType.rewardTable) {
      if (!resourceIds.has(reward.resourceId)) {
        errors.push(`blockTypes.${blockType.id}.rewardTable references missing resource ${reward.resourceId}`);
      }

      if (reward.min > reward.max) {
        errors.push(`blockTypes.${blockType.id}.rewardTable has min greater than max for ${reward.resourceId}`);
      }
    }
  }

  for (const mineTemplate of parsed.data.mineTemplates) {
    validateLocalizationKey(mineTemplate.displayNameKey, "ru", ruLocalization, errors);

    for (const stratum of mineTemplate.strata) {
      if (stratum.fromRow > stratum.toRow) {
        errors.push(`mineTemplates.${mineTemplate.id}.strata.${stratum.id} has fromRow greater than toRow`);
      }

      if (stratum.toRow >= mineTemplate.height) {
        errors.push(`mineTemplates.${mineTemplate.id}.strata.${stratum.id} exceeds mine height`);
      }

      for (const blockTypeId of Object.keys(stratum.blockWeights)) {
        if (!blockTypeIds.has(blockTypeId)) {
          errors.push(`mineTemplates.${mineTemplate.id}.strata.${stratum.id} references missing block ${blockTypeId}`);
        }
      }
    }
  }

  for (const resource of parsed.data.resources) {
    validateLocalizationKey(resource.nameKey, "ru", ruLocalization, errors);
  }

  for (const goblin of parsed.data.goblins) {
    validateLocalizationKey(goblin.nameKey, "ru", ruLocalization, errors);
    validateLocalizationKey(goblin.descriptionKey, "ru", ruLocalization, errors);
    validateLocalizationKey(goblin.ability.nameKey, "ru", ruLocalization, errors);
    validateLocalizationKey(goblin.ability.descriptionKey, "ru", ruLocalization, errors);
    validateResourceAmounts(`goblins.${goblin.id}.hireCost`, goblin.hireCost, resourceIds, errors);
    validateUnlockRequirements(
      `goblins.${goblin.id}.unlockRequirements`,
      goblin.unlockRequirements,
      resourceIds,
      mineTemplateIds,
      errors
    );
  }

  return {
    ok: errors.length === 0,
    errors
  };
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

function collectDuplicateIds(collectionName: string, items: Array<{ id: string }>, errors: string[]): void {
  const seen = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`${collectionName} has duplicate id ${item.id}`);
    }

    seen.add(item.id);
  }
}
