import { describe, expect, it } from "vitest";
import { blockTypeSchema, goblinSchema, rewardChestTypeSchema, starterContentBundle, validateContentBundle } from "./index";

describe("content schemas", () => {
  it("accepts a valid block type", () => {
    const result = blockTypeSchema.safeParse({
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
    });

    expect(result.success).toBe(true);
  });

  it("rejects broken hp values", () => {
    const result = blockTypeSchema.safeParse({
      id: "stone",
      nameKey: "block.stone.name",
      baseHp: 0,
      visualStateAssets: {
        intact: "a",
        cracked: "b",
        breaking: "c"
      },
      rewardTable: []
    });

    expect(result.success).toBe(false);
  });

  it("accepts starter content bundle", () => {
    expect(validateContentBundle(starterContentBundle)).toEqual({
      ok: true,
      errors: []
    });
  });

  it("accepts a valid goblin config", () => {
    const result = goblinSchema.safeParse(starterContentBundle.goblins[0]);

    expect(result.success).toBe(true);
  });

  it("accepts collector specialization and mine bonus effects", () => {
    const collector = starterContentBundle.goblins.find((goblin) => goblin.id === "pip_dry_book");

    expect(collector?.specialization).toBe("warehouse_keeper");
    expect(goblinSchema.safeParse(collector).success).toBe(true);
  });

  it("accepts a valid reward chest config", () => {
    const result = rewardChestTypeSchema.safeParse(starterContentBundle.rewardChestTypes[0]);

    expect(result.success).toBe(true);
  });

  it("rejects missing resource references", () => {
    const broken = structuredClone(starterContentBundle);
    broken.blockTypes[0]?.rewardTable.push({ resourceId: "missing_resource", min: 1, max: 1, chance: 1 });

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("blockTypes.dirt.rewardTable references missing resource missing_resource");
  });

  it("rejects missing block references in mine cell map", () => {
    const broken = structuredClone(starterContentBundle);
    const firstCell = broken.mineTemplates[0]?.cellMap[0];

    if (firstCell) {
      firstCell.blockTypeId = "missing_block";
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("mineTemplates.old_well_01.cellMap.0:0 references missing block missing_block");
  });

  it("rejects missing resource references in reward chests", () => {
    const broken = structuredClone(starterContentBundle);
    broken.rewardChestTypes[0]?.rewardTable.push({ resourceId: "missing_resource", min: 1, max: 1, chance: 1 });

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("rewardChestTypes.wooden_completion_chest.rewardTable references missing resource missing_resource");
  });

  it("rejects missing mine completion reward chests", () => {
    const broken = structuredClone(starterContentBundle);
    const mineTemplate = broken.mineTemplates[0];

    if (mineTemplate) {
      mineTemplate.completionRewardChestTypeId = "missing_chest";
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("mineTemplates.old_well_01 references missing completion reward chest missing_chest");
  });

  it("rejects missing mine completion vein references", () => {
    const broken = structuredClone(starterContentBundle);
    const mineTemplate = broken.mineTemplates[0];

    if (mineTemplate) {
      mineTemplate.completionVeinTypeId = "missing_vein";
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("mineTemplates.old_well_01 references missing completion vein type missing_vein");
  });

  it("rejects missing vein references in mine cell map", () => {
    const broken = structuredClone(starterContentBundle);
    const firstCell = broken.mineTemplates[0]?.cellMap[0];

    if (firstCell) {
      firstCell.special = "vein";
      firstCell.veinTypeId = "missing_vein";
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("mineTemplates.old_well_01.cellMap.0:0 references missing vein type missing_vein");
  });

  it("rejects built mine configs with missing production resources", () => {
    const broken = structuredClone(starterContentBundle);
    const builtMine = broken.builtMineTypes.find((item) => item.id === "small_copper_mine");

    if (builtMine) {
      builtMine.productionResourceId = "missing_resource";
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("builtMineTypes.small_copper_mine references missing production resource missing_resource");
  });

  it("accepts legacy content without localization", () => {
    const legacy = structuredClone(starterContentBundle);
    Reflect.deleteProperty(legacy, "localization");

    expect(validateContentBundle(legacy)).toEqual({
      ok: true,
      errors: []
    });
  });

  it("rejects missing localization keys when locale exists", () => {
    const broken = structuredClone(starterContentBundle);
    const ru = broken.localization.ru;

    if (ru) {
      delete ru["block.dirt.name"];
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("localization.ru is missing key block.dirt.name");
  });

  it("rejects goblin hire cost with missing resources", () => {
    const broken = structuredClone(starterContentBundle);
    const goblin = broken.goblins[0];

    if (goblin) {
      goblin.hireCost.push({ resourceId: "missing_resource", amount: 10 });
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("goblins.gryzz_crooked_tooth.hireCost references missing resource missing_resource");
  });

  it("rejects missing goblin localization keys when locale exists", () => {
    const broken = structuredClone(starterContentBundle);
    const ru = broken.localization.ru;

    if (ru) {
      delete ru["goblin.gryzz.name"];
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("localization.ru is missing key goblin.gryzz.name");
  });

  it("rejects goblin production bonus with missing resource", () => {
    const broken = structuredClone(starterContentBundle);
    const goblin = broken.goblins.find((item) => item.id === "nokk_copper_quill");

    if (goblin) {
      goblin.ability.effects = [{ type: "mine_production_multiplier", resourceId: "missing_resource", value: 1.1 }];
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("goblins.nokk_copper_quill.ability.effects references missing resource missing_resource");
  });
});
