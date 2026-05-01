import { starterContentBundle } from "@goblin-cartel/content-schemas";
import { describe, expect, it } from "vitest";
import { contentVersionWithRuntimeSuffix, createRuntimeContentBundle } from "./runtimeContent";

describe("runtime content", () => {
  it("keeps current starter content unchanged when it is already sorted", () => {
    expect(createRuntimeContentBundle(starterContentBundle)).toBe(starterContentBundle);
    expect(contentVersionWithRuntimeSuffix("0.0.8")).toBe("0.0.8");
  });

  it("sorts mines by authored sort order", () => {
    const content = structuredClone(starterContentBundle);
    content.mineTemplates = [...content.mineTemplates].reverse();

    const runtimeContent = createRuntimeContentBundle(content);

    expect(runtimeContent.mineTemplates.map((mineTemplate) => mineTemplate.id)).toEqual([
      "old_well_01",
      "abandoned_crosscut_02",
      "lower_gallery_03",
      "sunken_works_04",
      "red_iron_drop_05"
    ]);
  });

  it("keeps authored mine dimensions unchanged", () => {
    const content = structuredClone(starterContentBundle);
    const mine = content.mineTemplates[0];

    if (!mine) {
      throw new Error("Missing starter mine");
    }

    mine.height = 40;
    mine.depthMeters = 200;
    mine.cellMap = Array.from({ length: 40 }, (_rowItem, row) =>
      Array.from({ length: mine.width }, (_colItem, col) => ({
        blockTypeId: row >= 8 ? "stone" : "dirt",
        col,
        row
      }))
    ).flat();

    const runtimeContent = createRuntimeContentBundle(content);
    const runtimeMine = runtimeContent.mineTemplates[0];

    expect(runtimeMine?.height).toBe(40);
    expect(runtimeMine?.depthMeters).toBe(200);
    expect(runtimeMine?.id).toBe("old_well_01");
    expect(runtimeMine?.cellMap).toHaveLength(mine.width * 40);
    expect(runtimeMine?.cellMap.at(-1)).toMatchObject({ blockTypeId: "stone", row: 39 });
    expect(contentVersionWithRuntimeSuffix("0.0.4")).toBe("0.0.4");
  });

  it("backfills boss card runtime resources and drops for already published content", () => {
    const content = structuredClone(starterContentBundle);
    content.resources = content.resources.filter((resource) => resource.id !== "elixir" && !resource.id.startsWith("boss_card_"));
    content.blockTypes = content.blockTypes.map((blockType) => ({
      ...blockType,
      rewardTable: blockType.rewardTable.filter((reward) => reward.resourceId !== "elixir")
    }));
    content.rewardChestTypes = content.rewardChestTypes.map((chestType) => ({
      ...chestType,
      rewardTable: chestType.rewardTable.filter((reward) => reward.resourceId !== "elixir" && !reward.resourceId.startsWith("boss_card_"))
    }));
    content.bossCards = [];

    const runtimeContent = createRuntimeContentBundle(content);

    expect(runtimeContent.resources.map((resource) => resource.id)).toEqual(
      expect.arrayContaining([
        "elixir",
        "boss_card_hit_damage",
        "boss_card_crit_chance",
        "boss_card_crit_multiplier",
        "boss_card_max_energy"
      ])
    );
    expect(runtimeContent.blockTypes.every((blockType) => blockType.rewardTable.some((reward) => reward.resourceId === "elixir"))).toBe(true);
    expect(
      runtimeContent.rewardChestTypes.every((chestType) =>
        chestType.rewardTable.some((reward) => reward.resourceId.startsWith("boss_card_"))
      )
    ).toBe(true);
    expect(runtimeContent.localization.ru?.["resource.elixir.name"]).toBe("Эликсир");
    expect(runtimeContent.localization.ru?.["boss_card.hit_damage.name"]).toBe("Сила удара");
    expect(runtimeContent.bossCards.map((card) => card.id)).toEqual(["hit_damage", "crit_chance", "crit_multiplier", "max_energy"]);
  });
});
