import { describe, expect, it } from "vitest";
import {
  blockTypeSchema,
  bossCardSchema,
  elevatorSchema,
  goblinGenerationSchema,
  rewardChestTypeSchema,
  starterContentBundle,
  validateContentBundle
} from "./index";

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
    expect(starterContentBundle.resources.some((resource) => resource.id === "iron")).toBe(true);
    expect(starterContentBundle.resources.some((resource) => resource.id === "elixir")).toBe(true);
    expect(starterContentBundle.resources.some((resource) => resource.id === "boss_card_hit_damage")).toBe(true);
    expect(starterContentBundle.blockTypes.some((blockType) => blockType.id === "iron_ore")).toBe(true);
    expect(starterContentBundle.blockTypes.some((blockType) => blockType.id === "gold_cache")).toBe(true);
    expect(starterContentBundle.blockTypes.every((blockType) => blockType.rewardTable.some((reward) => reward.resourceId === "elixir"))).toBe(
      true
    );
    expect(
      starterContentBundle.rewardChestTypes.every((chestType) =>
        chestType.rewardTable.some((reward) => reward.resourceId.startsWith("boss_card_"))
      )
    ).toBe(true);
    expect(rewardChance("wooden_completion_chest", "boss_card_hit_damage")).toBe(1);
    expect(rewardChance("wooden_completion_chest", "boss_card_max_energy")).toBe(0.75);
    expect(rewardChance("wooden_completion_chest", "boss_card_crit_chance")).toBe(0.18);
    expect(rewardChance("wooden_completion_chest", "boss_card_crit_multiplier")).toBeNull();
    expect(rewardChance("iron_completion_chest", "boss_card_crit_multiplier")).toBe(0.2);
    expect(rewardChance("steel_completion_chest", "boss_card_crit_multiplier")).toBe(0.55);
    expect(starterContentBundle.bossCards.map((card) => [card.id, card.assetId, card.cardResourceId, card.effectType])).toEqual([
      ["hit_damage", "boss_card_hit_damage_v1", "boss_card_hit_damage", "damagePerTap"],
      ["crit_chance", "boss_card_crit_chance_v1", "boss_card_crit_chance", "critChance"],
      ["crit_multiplier", "boss_card_crit_multiplier_v1", "boss_card_crit_multiplier", "critMultiplier"],
      ["max_energy", "boss_card_max_energy_v1", "boss_card_max_energy", "maxEnergy"]
    ]);
    expect(starterContentBundle.goblinHut.levels.map((level) => [level.level, level.maxHiredGoblins, level.unlockedClasses])).toEqual([
      [1, 2, ["miner"]],
      [2, 3, ["miner", "builder"]],
      [3, 5, ["miner", "builder", "collector"]],
      [4, 8, ["miner", "builder", "collector", "foreman"]]
    ]);
    expect(starterContentBundle.goblinGeneration.archetypes.map((archetype) => [archetype.id, archetype.class])).toEqual([
      ["random_miner_contract", "miner"],
      ["random_collector_contract", "collector"],
      ["random_foreman_contract", "foreman"]
    ]);
    expect(starterContentBundle.goblinGeneration.archetypes.every((archetype) => archetype.ability && archetype.leveling)).toBe(true);
    expect(starterContentBundle.goblinGeneration.namePool.names.length).toBeGreaterThanOrEqual(100);
    expect(starterContentBundle.goblinGeneration.namePool.nicknames.length).toBeGreaterThanOrEqual(100);
    expect(starterContentBundle.goblinGeneration.archetypes.find((archetype) => archetype.id === "random_collector_contract")?.specialization).toBe(
      "warehouse_keeper"
    );
    expect(starterContentBundle.goblinGeneration.archetypes.every((archetype) => archetype.renderPool.length > 0)).toBe(true);
    expect(starterContentBundle.goblinGeneration.hireCardSkin.cardBases.common).toBe("ui_hire_card_base_common_v1");
    expect(starterContentBundle.goblinGeneration.hireCardSkin.buttons.normal).toBe("ui_hire_button_normal_v1");
    expect(starterContentBundle.goblinGeneration.hireCardSkin.screenBackground).toBe("ui_goblin_screen_pattern_v1");
    expect(starterContentBundle.goblinGeneration.hireCardSkin.titlePlate).toBe("ui_hire_title_plate_v1");
    expect(starterContentBundle.goblinGeneration.hireCardSkin.ownedCards.base).toBe("ui_owned_goblin_card_base_v1");
    expect(starterContentBundle.goblinGeneration.hireCardSkin.ownedCards.upgradeArrow).toBe("ui_owned_goblin_upgrade_arrow_v1");
    expect(starterContentBundle.goblinGeneration.hireCardSkin.icons.strength).toBe("ui_icon_pickaxe_v1");
    expect(starterContentBundle.goblinHut.levels.map((level) => [level.level, level.upgradeCost])).toEqual([
      [1, []],
      [
        2,
        [
          { resourceId: "gold", amount: 240 },
          { resourceId: "stone", amount: 70 }
        ]
      ],
      [
        3,
        [
          { resourceId: "gold", amount: 850 },
          { resourceId: "stone", amount: 180 },
          { resourceId: "copper_ore", amount: 45 }
        ]
      ],
      [
        4,
        [
          { resourceId: "gold", amount: 2200 },
          { resourceId: "stone", amount: 360 },
          { resourceId: "copper_ore", amount: 110 },
          { resourceId: "iron", amount: 35 }
        ]
      ]
    ]);
    expect(elevatorSchema.safeParse(starterContentBundle.elevator).success).toBe(true);
    expect(
      starterContentBundle.elevator.levels.map((level) => [
        level.level,
        level.platformSlots,
        level.dropDurationMs,
        level.offlineDamageMultiplier,
        level.stabilityPercent,
        level.visualStage
      ])
    ).toEqual([
      [1, 2, 1450, 1, 20, 1],
      [2, 3, 1320, 1.05, 35, 2],
      [3, 4, 1190, 1.1, 50, 3],
      [4, 5, 1060, 1.16, 68, 4],
      [5, 7, 920, 1.25, 85, 5]
    ]);
    expect(starterContentBundle.elevator.levels[4]?.upgradeCost).toEqual([
      { resourceId: "gold", amount: 6500 },
      { resourceId: "iron", amount: 120 },
      { resourceId: "elixir", amount: 20 }
    ]);
    expect(starterContentBundle.mineTemplates).toHaveLength(10);
    expect(starterContentBundle.mineTemplates.map((mineTemplate) => [mineTemplate.width, mineTemplate.height, mineTemplate.depthMeters])).toEqual([
      [7, 3, 3],
      [7, 4, 4],
      [7, 5, 5],
      [7, 6, 6],
      [7, 7, 7],
      [7, 8, 8],
      [7, 9, 9],
      [7, 10, 10],
      [7, 10, 10],
      [7, 10, 10]
    ]);
    expect(starterContentBundle.mineTemplates.map((mineTemplate) => [mineTemplate.difficultyStart, mineTemplate.difficultyEnd])).toEqual([
      [1, 1.15],
      [1.05, 1.2],
      [1.1, 1.25],
      [1.15, 1.3],
      [1.2, 1.35],
      [1.25, 1.4],
      [1.3, 1.45],
      [1.35, 1.5],
      [1.4, 1.55],
      [1.45, 1.6]
    ]);
    expect(starterContentBundle.mineTemplates.every((mineTemplate) => mineTemplate.cellMap.length === mineTemplate.width * mineTemplate.height)).toBe(true);
    expect(starterContentBundle.localization.ru?.["resource.copper_ore.name"]).toBe("Медь");
  });

  it("keeps starter content free from legacy editor fields and broken text", () => {
    const blockIds = new Set(starterContentBundle.blockTypes.map((blockType) => blockType.id));
    const authoredBlockRefs = starterContentBundle.mineTemplates.flatMap((mineTemplate) =>
      mineTemplate.cellMap.map((cell) => cell.blockTypeId)
    );

    expect(blockIds.has("chest_wooden")).toBe(false);
    expect(authoredBlockRefs).not.toContain("chest_wooden");

    for (const mineTemplate of starterContentBundle.mineTemplates as Array<Record<string, unknown>>) {
      expect(mineTemplate).not.toHaveProperty("seedMode");
      expect(mineTemplate).not.toHaveProperty("strata");
      expect(mineTemplate).not.toHaveProperty("guaranteedObjects");

      for (const cell of mineTemplate.cellMap as Array<Record<string, unknown>>) {
        expect(cell).not.toHaveProperty("hpMultiplier");
      }
    }
  });

  it("accepts a valid goblin generation config", () => {
    const result = goblinGenerationSchema.safeParse(starterContentBundle.goblinGeneration);

    expect(result.success).toBe(true);
  });

  it("accepts a valid reward chest config", () => {
    const result = rewardChestTypeSchema.safeParse(starterContentBundle.rewardChestTypes[0]);

    expect(result.success).toBe(true);
  });

  it("accepts a valid boss card config", () => {
    const result = bossCardSchema.safeParse(starterContentBundle.bossCards[0]);

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

  it("rejects missing boss card resources", () => {
    const broken = structuredClone(starterContentBundle);
    const card = broken.bossCards[0];

    if (card) {
      card.cardResourceId = "missing_card_resource";
      card.elixirResourceId = "missing_elixir_resource";
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("bossCards.hit_damage references missing card resource missing_card_resource");
    expect(result.errors).toContain("bossCards.hit_damage references missing elixir resource missing_elixir_resource");
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

  it("rejects missing depth progress reward resources", () => {
    const broken = structuredClone(starterContentBundle);
    const mineTemplate = broken.mineTemplates[0];

    if (mineTemplate?.depthProgressReward) {
      mineTemplate.depthProgressReward.resourceId = "missing_resource";
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("mineTemplates.old_well_01.depthProgressReward references missing resource missing_resource");
  });

  it("rejects missing reward chest references in mine cell map", () => {
    const broken = structuredClone(starterContentBundle);
    const firstCell = broken.mineTemplates[0]?.cellMap[0];

    if (firstCell) {
      firstCell.special = "reward_chest";
      firstCell.rewardChestTypeId = "missing_chest";
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("mineTemplates.old_well_01.cellMap.0:0 references missing reward chest type missing_chest");
  });

  it("rejects legacy mine templates without authored cell maps", () => {
    const broken = structuredClone(starterContentBundle) as unknown as {
      mineTemplates: Array<Record<string, unknown>>;
    };
    const mineTemplate = broken.mineTemplates[0];

    if (mineTemplate) {
      Reflect.deleteProperty(mineTemplate, "cellMap");
      mineTemplate.strata = [
        {
          id: "legacy_top",
          fromRow: 0,
          toRow: 9,
          blockWeights: { dirt: 1 }
        }
      ];
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringContaining("mineTemplates.0.cellMap"));
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

  it("rejects built mine configs with missing upgrade cost resources", () => {
    const broken = structuredClone(starterContentBundle);
    const builtMine = broken.builtMineTypes.find((item) => item.id === "small_copper_mine");

    if (builtMine) {
      builtMine.upgrade.cost.push({
        resourceId: "missing_resource",
        useProductionResource: false,
        baseAmount: 10,
        levelMultiplier: 1,
        levelPower: 1
      });
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("builtMineTypes.small_copper_mine.upgrade.cost.2 references missing resource missing_resource");
  });

  it("rejects broken goblin hut progression config", () => {
    const broken = structuredClone(starterContentBundle);
    const level = broken.goblinHut.levels[1];

    if (level) {
      level.level = 1;
      level.upgradeCost = [{ resourceId: "missing_resource", amount: 10 }];
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("goblinHut.levels has duplicate level 1");
    expect(result.errors).toContain("goblinHut.levels.1.upgradeCost references missing resource missing_resource");
  });

  it("rejects broken elevator progression config", () => {
    const broken = structuredClone(starterContentBundle);
    const level = broken.elevator.levels[1];

    if (level) {
      level.level = 1;
      level.upgradeCost = [{ resourceId: "missing_resource", amount: 10 }];
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("elevator.levels has duplicate level 1");
    expect(result.errors).toContain("elevator.levels.1.upgradeCost references missing resource missing_resource");
  });

  it("rejects content without localization", () => {
    const broken = structuredClone(starterContentBundle);
    Reflect.deleteProperty(broken, "localization");

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("localization: Invalid input: expected record, received undefined");
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

  it("rejects suspicious broken localization text", () => {
    const broken = structuredClone(starterContentBundle);
    const ru = broken.localization.ru;

    if (ru) {
      ru["resource.gold.name"] = "??????"; // intentional broken-text fixture
      ru["resource.stone.name"] = `${String.fromCharCode(0x0420, 0x2014)}${String.fromCharCode(0x0420, 0x0455)}`;
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("localization.ru.resource.gold.name contains suspicious broken text");
    expect(result.errors).toContain("localization.ru.resource.stone.name contains suspicious broken text");
  });

  it("rejects broken goblin generation references", () => {
    const broken = structuredClone(starterContentBundle);
    const archetype = broken.goblinGeneration.archetypes[0];

    if (archetype) {
      archetype.hireCost = [{ resourceId: "missing_resource", amount: 10 }];
      archetype.ability = {
        ...archetype.ability,
        effects: [{ type: "mine_production_multiplier", resourceId: "missing_resource", value: 1.1 }],
        id: archetype.ability.id,
        nameKey: archetype.ability.nameKey,
        descriptionKey: archetype.ability.descriptionKey
      };
      archetype.leveling = {
        ...archetype.leveling,
        cost: [{ resourceId: "missing_resource", baseAmount: 10, levelMultiplier: 1, levelPower: 1 }]
      };
      archetype.rarityWeights.push({ rarity: "common", statMultiplier: 1, weight: 1 });
      archetype.traitPool.push({ id: "stone_focus", nameKey: "missing.trait.name", weight: 1 });
      const firstRender = archetype.renderPool[0];
      if (firstRender) {
        archetype.renderPool.push({ ...firstRender, weight: 1 });
      }
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "goblinGeneration.archetypes.random_miner_contract.hireCost references missing resource missing_resource"
    );
    expect(result.errors).toContain(
      "goblinGeneration.archetypes.random_miner_contract.ability.effects references missing resource missing_resource"
    );
    expect(result.errors).toContain(
      "goblinGeneration.archetypes.random_miner_contract.leveling.cost.0 references missing resource missing_resource"
    );
    expect(result.errors).toContain("goblinGeneration.archetypes.random_miner_contract.rarityWeights has duplicate rarity common");
    expect(result.errors).toContain("goblinGeneration.archetypes.random_miner_contract.traitPool has duplicate trait stone_focus");
    expect(result.errors).toContain("goblinGeneration.archetypes.random_miner_contract.renderPool has duplicate asset goblin_hire_miner_v1");
    expect(result.errors).toContain("localization.ru is missing key missing.trait.name");
  });

  it("requires goblin hire costs to use gold", () => {
    const broken = structuredClone(starterContentBundle);
    const archetype = broken.goblinGeneration.archetypes[0];

    if (archetype) {
      archetype.hireCost = [{ resourceId: "stone", amount: 10 }];
    }

    const result = validateContentBundle(broken);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("goblinGeneration.archetypes.random_miner_contract.hireCost.0 must use gold");
  });
});

function rewardChance(chestTypeId: string, resourceId: string): number | null {
  const chestType = starterContentBundle.rewardChestTypes.find((item) => item.id === chestTypeId);
  const reward = chestType?.rewardTable.find((item) => item.resourceId === resourceId);

  return reward?.chance ?? null;
}
