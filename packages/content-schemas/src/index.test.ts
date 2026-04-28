import { describe, expect, it } from "vitest";
import { blockTypeSchema, starterContentBundle, validateContentBundle } from "./index";

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

  it("rejects missing resource references", () => {
    const broken = structuredClone(starterContentBundle);
    broken.blockTypes[0]?.rewardTable.push({ resourceId: "missing_resource", min: 1, max: 1, chance: 1 });

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("blockTypes.dirt.rewardTable references missing resource missing_resource");
  });

  it("rejects missing block references in mine strata", () => {
    const broken = structuredClone(starterContentBundle);
    const firstStratum = broken.mineTemplates[0]?.strata[0];

    if (firstStratum) {
      firstStratum.blockWeights.missing_block = 1;
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("mineTemplates.old_well_01.strata.top_soil references missing block missing_block");
  });
});
