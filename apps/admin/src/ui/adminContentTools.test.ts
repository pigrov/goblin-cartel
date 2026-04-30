import { describe, expect, it } from "vitest";
import {
  addDraftBlockTypeTemplate,
  addDraftMineTemplate,
  addDraftRewardChestTypeTemplate,
  adminContentVersionPath,
  adminSectionPath,
  createMineVisualRows,
  getMineVisualCell,
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

  it("creates a clean 8x10 mine cell map template", () => {
    const result = addDraftMineTemplate({
      ...baseContent,
      mineTemplates: [
        {
          cellMap: [],
          completionRewardChestTypeId: "wooden_completion_chest",
          completionVeinTypeId: "gold_vein",
          depthMeters: 20,
          difficultyEnd: 3,
          difficultyStart: 2,
          displayNameKey: "mine.old.name",
          height: 20,
          id: "old_mine",
          sortOrder: 10,
          width: 12
        }
      ]
    });
    const createdMine = result.content.mineTemplates.at(-1);
    const createdCellMap = Array.isArray(createdMine?.cellMap) ? createdMine.cellMap : [];

    expect(result.entityKind).toBe("mineTemplates");
    expect(result.entityId).toBe("draft_mine_02");
    expect(createdMine).toMatchObject({
      depthMeters: 10,
      difficultyEnd: 1.8,
      difficultyStart: 1,
      height: 10,
      id: "draft_mine_02",
      width: 8
    });
    expect(createdCellMap).toHaveLength(80);
    expect(createdCellMap[0]).toMatchObject({ blockTypeId: "stone_block", col: 0, row: 0 });
    expect(result.content.localization?.ru?.["mine.draft_mine_02.name"]).toBe("Новый рудник");
  });
});

describe("admin mine visual editor helpers", () => {
  it("builds row previews from editable cells", () => {
    const rows = createMineVisualRows(baseContent, {
      cellBlock_0_1: "gold_block",
      cellHp_0_1: "75",
      cellRewardChestTypeId_1_2: "wooden_completion_chest",
      cellSpecial_1_2: "reward_chest",
      height: "2",
      width: "3"
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]?.cells).toHaveLength(3);
    expect(rows[0]?.cells[0]).toMatchObject({ blockTypeId: "stone_block", col: 0, row: 0 });
    expect(rows[0]?.cells[1]).toMatchObject({ blockTypeId: "gold_block", hp: "75" });
    expect(rows[1]?.cells[2]).toMatchObject({
      blockTypeId: "stone_block",
      rewardChestTypeId: "wooden_completion_chest",
      special: "reward_chest"
    });
  });

  it("uses the first block as a fallback for clean cells", () => {
    expect(getMineVisualCell({ height: "1", width: "1" }, 0, 0, baseContent)).toMatchObject({
      blockTypeId: "stone_block",
      col: 0,
      row: 0
    });
  });
});
