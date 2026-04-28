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

export type ResourceConfig = z.infer<typeof resourceSchema>;
export type BlockTypeConfig = z.infer<typeof blockTypeSchema>;
export type MineTemplateConfig = z.infer<typeof mineTemplateSchema>;
