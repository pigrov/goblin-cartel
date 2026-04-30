import { describe, expect, it } from "vitest";
import {
  addDraftBlockTypeTemplate,
  addDraftRewardChestTypeTemplate,
  adminContentVersionPath,
  adminSectionPath,
  createEvenMineStrataPatch,
  createMineVisualRows,
  readAdminRoutePath
} from "./App";

const baseContent = {
  resources: [
    { id: "stone", nameKey: "resource.stone.name" },
    { id: "gold", nameKey: "resource.gold.name" }
  ],
  blockTypes: [
    { id: "stone_block", nameKey: "block.stone.name" },
    { id: "gold_block", nameKey: "block.gold.name" },
    { id: "draft_block_03", nameKey: "block.existing.name" }
  ],
  veinTypes: [{ id: "gold_vein", nameKey: "vein.gold.name" }],
  mineTemplates: [],
  goblins: [],
  localization: {
    ru: {
      "block.gold.name": "Золотой блок",
      "block.stone.name": "Каменный блок",
      "resource.stone.name": "Камень",
      "resource.gold.name": "Золото",
      "vein.gold.name": "Золотая жила"
    }
  }
};

describe("admin content routes", () => {
  it("maps admin content list and version paths", () => {
    expect(adminSectionPath("content")).toBe("/admin/content");
    expect(adminContentVersionPath("0.0.5")).toBe("/admin/content/0.0.5");
    expect(readAdminRoutePath("/admin/content/")).toEqual({ contentVersionSlug: null, section: "content" });
    expect(readAdminRoutePath("/admin/content/0.0.5")).toEqual({
      contentVersionSlug: "0.0.5",
      section: "content"
    });
  });
});

describe("admin draft templates", () => {
  it("creates a new block type and selects it for editing", () => {
    const result = addDraftBlockTypeTemplate(baseContent);
    const createdBlock = result.content.blockTypes.at(-1);

    expect(result.entityKind).toBe("blockTypes");
    expect(result.entityId).toBe("draft_block_04");
    expect(createdBlock).toMatchObject({
      baseHp: 80,
      id: "draft_block_04",
      specialBehavior: "none"
    });
    expect(result.content.localization?.ru?.["block.draft_block_04.name"]).toBe("Новый блок");
  });

  it("creates a new reward chest type and selects it for editing", () => {
    const result = addDraftRewardChestTypeTemplate(baseContent);
    const createdChest = result.content.rewardChestTypes?.at(-1);

    expect(result.entityKind).toBe("rewardChestTypes");
    expect(result.entityId).toBe("draft_reward_chest_01");
    expect(createdChest).toMatchObject({
      assetId: "reward_chest_draft_reward_chest_01_v1",
      id: "draft_reward_chest_01",
      tier: "wooden"
    });
    expect(result.content.localization?.ru?.["reward_chest.draft_reward_chest_01.name"]).toBe("Новый сундук");
  });
});

describe("admin mine visual editor helpers", () => {
  it("spreads strata across the full mine height", () => {
    expect(createEvenMineStrataPatch({ height: "10", strataCount: "3" })).toEqual({
      strataFromRow_0: "0",
      strataFromRow_1: "3",
      strataFromRow_2: "6",
      strataToRow_0: "2",
      strataToRow_1: "5",
      strataToRow_2: "9"
    });
  });

  it("builds row previews from strata weights and guaranteed objects", () => {
    const rows = createMineVisualRows(baseContent, {
      height: "4",
      objectBlockTypeId_0: "",
      objectCount: "1",
      objectItemCount_0: "1",
      objectRowEnd_0: "3",
      objectRowStart_0: "3",
      objectType_0: "vein",
      objectVeinTypeId_0: "gold_vein",
      strataCount: "2",
      strataFromRow_0: "0",
      strataFromRow_1: "2",
      strataId_0: "top",
      strataId_1: "deep",
      strataToRow_0: "1",
      strataToRow_1: "3",
      strataWeight_0_gold_block: "0",
      strataWeight_0_stone_block: "10",
      strataWeight_1_gold_block: "9",
      strataWeight_1_stone_block: "1"
    });

    expect(rows[0]).toMatchObject({ dominantBlockId: "stone_block", row: 0, stratumId: "top" });
    expect(rows[3]).toMatchObject({ dominantBlockId: "gold_block", row: 3, stratumId: "deep" });
    expect(rows[3]?.objectMarkers[0]).toMatchObject({ shortLabel: "Ж", type: "vein" });
  });
});
