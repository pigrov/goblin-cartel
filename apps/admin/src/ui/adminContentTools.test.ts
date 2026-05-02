import { describe, expect, it } from "vitest";
import {
  addDraftBlockTypeTemplate,
  addDraftBossCardTemplate,
  addDraftMineTemplate,
  addDraftRewardChestTypeTemplate,
  adminContentVersionPath,
  adminSectionPath,
  applyBossCardDropBalanceToFormState,
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
  bossCards: [],
  mineTemplates: [],
  goblins: [],
  goblinHut: {
    id: "default",
    levels: [
      {
        hireCostMultiplier: 1,
        level: 1,
        maxHiredGoblins: 2,
        nameKey: "goblin_hut.level.1.name",
        unlockedClasses: ["miner"],
        upgradeCost: [],
        upgradeCostMultiplier: 1,
        unlockRequirements: []
      }
    ],
    nameKey: "goblin_hut.name"
  },
  localization: {
    ru: {
      "block.gold.name": "Золотой блок",
      "block.stone.name": "Каменный блок",
      "goblin_hut.level.1.name": "Стартовая Хижина",
      "goblin_hut.name": "Хижина",
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

  it("creates a new boss card and selects it for editing", () => {
    const result = addDraftBossCardTemplate({
      ...baseContent,
      resources: [
        ...baseContent.resources,
        { id: "elixir", nameKey: "resource.elixir.name" },
        { id: "boss_card_hit_damage", nameKey: "resource.boss_card_hit_damage.name" }
      ]
    });
    const createdCard = result.content.bossCards?.at(-1);

    expect(result.entityKind).toBe("bossCards");
    expect(result.entityId).toBe("draft_boss_card_01");
    expect(createdCard).toMatchObject({
      assetId: "boss_card_draft_boss_card_01_v1",
      cardResourceId: "boss_card_hit_damage",
      effectType: "damagePerTap",
      elixirResourceId: "elixir",
      id: "draft_boss_card_01"
    });
    expect(result.content.localization?.ru?.["boss_card.draft_boss_card_01.name"]).toBe("Новая карта босса");
  });

  it("creates a clean 7x10 mine cell map template", () => {
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
      width: 7
    });
    expect(createdCellMap).toHaveLength(70);
    expect(createdCellMap[0]).toMatchObject({ blockTypeId: "stone_block", col: 0, row: 0 });
    expect(result.content.localization?.ru?.["mine.draft_mine_02.name"]).toBe("Новый рудник");
  });
});

describe("admin chest and card balance tools", () => {
  it("applies elixir and boss card rarity balance to the reward table", () => {
    const content = {
      ...baseContent,
      resources: [
        ...baseContent.resources,
        { id: "elixir", nameKey: "resource.elixir.name" },
        { id: "boss_card_hit_damage", nameKey: "resource.boss_card_hit_damage.name" },
        { id: "boss_card_max_energy", nameKey: "resource.boss_card_max_energy.name" },
        { id: "boss_card_crit_chance", nameKey: "resource.boss_card_crit_chance.name" },
        { id: "boss_card_crit_multiplier", nameKey: "resource.boss_card_crit_multiplier.name" }
      ],
      bossCards: [
        { cardResourceId: "boss_card_hit_damage", elixirResourceId: "elixir", id: "hit_damage", nameKey: "boss_card.hit_damage.name", rarity: "common" },
        { cardResourceId: "boss_card_max_energy", elixirResourceId: "elixir", id: "max_energy", nameKey: "boss_card.max_energy.name", rarity: "common" },
        { cardResourceId: "boss_card_crit_chance", elixirResourceId: "elixir", id: "crit_chance", nameKey: "boss_card.crit_chance.name", rarity: "rare" },
        { cardResourceId: "boss_card_crit_multiplier", elixirResourceId: "elixir", id: "crit_multiplier", nameKey: "boss_card.crit_multiplier.name", rarity: "golden" }
      ]
    };
    const result = applyBossCardDropBalanceToFormState(content, {
      cardDropCommonChancePercent: "75",
      cardDropCommonMax: "2",
      cardDropCommonMin: "1",
      cardDropElixirChancePercent: "100",
      cardDropElixirMax: "12",
      cardDropElixirMin: "8",
      cardDropGoldenChancePercent: "15",
      cardDropGoldenMax: "1",
      cardDropGoldenMin: "1",
      cardDropRareChancePercent: "35",
      cardDropRareMax: "1",
      cardDropRareMin: "1",
      rewardChancePercent_0: "100",
      rewardCount: "3",
      rewardMax_0: "50",
      rewardMin_0: "30",
      rewardResourceId_0: "gold",
      rewardChancePercent_1: "1",
      rewardMax_1: "1",
      rewardMin_1: "1",
      rewardResourceId_1: "boss_card_hit_damage",
      rewardChancePercent_2: "100",
      rewardMax_2: "1",
      rewardMin_2: "1",
      rewardResourceId_2: "elixir"
    });

    expect(result.rewardCount).toBe("6");
    expect(result.rewardResourceId_0).toBe("gold");
    expect(result.rewardChancePercent_0).toBe("100");
    expect(result.rewardResourceId_1).toBe("elixir");
    expect(result.rewardMin_1).toBe("8");
    expect(result.rewardMax_1).toBe("12");
    expect(result.rewardResourceId_2).toBe("boss_card_hit_damage");
    expect(result.rewardChancePercent_2).toBe("75");
    expect(result.rewardResourceId_3).toBe("boss_card_max_energy");
    expect(result.rewardResourceId_4).toBe("boss_card_crit_chance");
    expect(result.rewardChancePercent_4).toBe("35");
    expect(result.rewardResourceId_5).toBe("boss_card_crit_multiplier");
    expect(result.rewardChancePercent_5).toBe("15");
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
