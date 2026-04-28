import { z } from "zod";

export const rewardEntrySchema = z.object({
  resourceId: z.string().min(1),
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
  chance: z.number().min(0).max(1)
});

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

export const contentBundleSchema = z
  .object({
    resources: z.array(resourceSchema).min(1),
    blockTypes: z.array(blockTypeSchema).min(1),
    mineTemplates: z.array(mineTemplateSchema).min(1)
  })
  .strict();

export type ResourceConfig = z.infer<typeof resourceSchema>;
export type BlockTypeConfig = z.infer<typeof blockTypeSchema>;
export type MineTemplateConfig = z.infer<typeof mineTemplateSchema>;
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
      height: 12,
      depthMeters: 60,
      difficulty: 1,
      seedMode: "playerBased",
      strata: [
        {
          id: "top_soil",
          fromRow: 0,
          toRow: 3,
          blockWeights: {
            dirt: 70,
            stone: 25,
            chest_wooden: 5
          }
        },
        {
          id: "stone_layer",
          fromRow: 4,
          toRow: 7,
          blockWeights: {
            dirt: 20,
            stone: 60,
            copper_ore: 15,
            chest_wooden: 5
          }
        },
        {
          id: "copper_layer",
          fromRow: 8,
          toRow: 11,
          blockWeights: {
            stone: 55,
            copper_ore: 40,
            chest_wooden: 5
          }
        }
      ]
    }
  ]
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

  const resourceIds = new Set(parsed.data.resources.map((resource) => resource.id));
  const blockTypeIds = new Set(parsed.data.blockTypes.map((blockType) => blockType.id));

  for (const blockType of parsed.data.blockTypes) {
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

  return {
    ok: errors.length === 0,
    errors
  };
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
