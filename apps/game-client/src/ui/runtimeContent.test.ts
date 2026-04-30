import { starterContentBundle } from "@goblin-cartel/content-schemas";
import { describe, expect, it } from "vitest";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";

describe("runtime content", () => {
  it("keeps current starter mine unchanged when it already has test depth", () => {
    expect(createRuntimeContentBundle(starterContentBundle)).toBe(starterContentBundle);
    expect(contentVersionWithRuntimeSuffix("fallback", starterContentBundle)).toBe("fallback:mine-10");
  });

  it("adds runtime defaults to older published content", () => {
    const legacyContent = structuredClone(starterContentBundle);
    const mine = legacyContent.mineTemplates[0];

    legacyContent.veinTypes = legacyContent.veinTypes.filter((veinType) => veinType.id !== "gold_vein_small");
    legacyContent.builtMineTypes = legacyContent.builtMineTypes.filter((builtMineType) => builtMineType.id !== "small_gold_mine");
    legacyContent.rewardChestTypes = [];

    if (mine) {
      mine.guaranteedObjects = [
        {
          type: "vein",
          veinTypeId: "copper_vein_small",
          blockTypeId: "copper_ore",
          rowRange: [6, 9],
          count: 1
        }
      ];
      Reflect.deleteProperty(mine, "completionVeinTypeId");
      Reflect.deleteProperty(mine, "completionRewardChestTypeId");
    }

    const runtimeContent = createRuntimeContentBundle(legacyContent);

    expect(runtimeContent.veinTypes.map((veinType) => veinType.id)).toContain("gold_vein_small");
    expect(runtimeContent.builtMineTypes.map((builtMineType) => builtMineType.id)).toContain("small_gold_mine");
    expect(runtimeContent.rewardChestTypes.map((chestType) => chestType.id)).toContain("wooden_completion_chest");
    expect(runtimeContent.mineTemplates[0]?.completionVeinTypeId).toBe("gold_vein_small");
    expect(runtimeContent.mineTemplates[0]?.completionRewardChestTypeId).toBe("wooden_completion_chest");
    expect(runtimeContent.mineTemplates[0]?.guaranteedObjects).toEqual([]);
  });

  it("restores starter mine ordering for older published content", () => {
    const legacyContent = structuredClone(starterContentBundle);
    const reversed = [...legacyContent.mineTemplates].reverse();

    legacyContent.mineTemplates = reversed.map((mineTemplate) => {
      const next = { ...mineTemplate };
      Reflect.deleteProperty(next, "sortOrder");
      return next;
    });

    const runtimeContent = createRuntimeContentBundle(legacyContent);

    expect(runtimeContent.mineTemplates.map((mineTemplate) => mineTemplate.id)).toEqual(["old_well_01", "abandoned_crosscut_02"]);
  });

  it("fills starter goblin defaults for older published content", () => {
    const legacyContent = structuredClone(starterContentBundle);
    const pip = legacyContent.goblins.find((goblin) => goblin.id === "pip_dry_book");

    legacyContent.goblins = legacyContent.goblins.filter((goblin) => goblin.id !== "nokk_copper_quill");

    if (pip) {
      Reflect.deleteProperty(pip, "specialization");
      pip.ability.effects = pip.ability.effects.filter((effect) => effect.type !== "mine_capacity_multiplier");
    }

    const runtimeContent = createRuntimeContentBundle(legacyContent);
    const runtimePip = runtimeContent.goblins.find((goblin) => goblin.id === "pip_dry_book");

    expect(runtimePip?.specialization).toBe("warehouse_keeper");
    expect(runtimePip?.ability.effects).toContainEqual({ type: "mine_capacity_multiplier", value: 1.15 });
    expect(runtimeContent.goblins.some((goblin) => goblin.id === "nokk_copper_quill")).toBe(true);
  });

  it("normalizes older published mine content to the 60m runtime depth", () => {
    const content = structuredClone(starterContentBundle);
    const mine = content.mineTemplates[0];

    if (!mine) {
      throw new Error("Missing starter mine");
    }

    mine.height = 40;
    mine.depthMeters = 200;
    mine.strata = [
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
    ];

    const runtimeContent = createRuntimeContentBundle(content);
    const runtimeMine = runtimeContent.mineTemplates[0];

    expect(runtimeMine?.height).toBe(10);
    expect(runtimeMine?.depthMeters).toBe(10);
    expect(runtimeMine?.id).toBe("old_well_01_test_10");
    expect(runtimeMine?.strata.map((stratum) => [stratum.fromRow, stratum.toRow])).toEqual([
      [0, 2],
      [3, 5],
      [6, 9]
    ]);
    expect(runtimeMine?.strata.at(-1)?.toRow).toBe(9);
    expect(contentVersionWithRuntimeSuffix("0.0.4", runtimeContent)).toBe("0.0.4:test-10");
  });
});
