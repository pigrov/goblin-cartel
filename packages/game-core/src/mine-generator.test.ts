import { describe, expect, it } from "vitest";
import { generateMine, type MineTemplate } from "./mine-generator";

const template: MineTemplate = {
  id: "old_well_01",
  width: 8,
  height: 12,
  strata: [
    {
      id: "top",
      fromRow: 0,
      toRow: 5,
      blockWeights: {
        dirt: 70,
        stone: 30
      }
    },
    {
      id: "bottom",
      fromRow: 6,
      toRow: 11,
      blockWeights: {
        stone: 60,
        copper_ore: 40
      }
    }
  ],
  guaranteedObjects: [
    {
      type: "vein",
      veinTypeId: "copper_vein_small",
      rowRange: [8, 11],
      count: 1
    }
  ]
};

describe("mine generator", () => {
  it("is deterministic for template and seed", () => {
    expect(generateMine(template, "player-1")).toEqual(generateMine(template, "player-1"));
  });

  it("places guaranteed objects", () => {
    const mine = generateMine(template, "player-2");
    const veins = mine.blocks.flat().filter((block) => block.special === "vein");

    expect(veins).toHaveLength(1);
    expect(veins[0]?.veinTypeId).toBe("copper_vein_small");
  });

  it("uses authored cell maps and interpolates row difficulty", () => {
    const mine = generateMine(
      {
        id: "painted_mine",
        width: 2,
        height: 2,
        difficultyStart: 1,
        difficultyEnd: 2,
        cellMap: [
          { row: 0, col: 0, blockTypeId: "dirt" },
          { row: 0, col: 1, blockTypeId: "stone", hp: 77, hpMultiplier: 1.5, special: "reward_chest", rewardChestTypeId: "wooden_completion_chest" },
          { row: 1, col: 0, blockTypeId: "copper_ore", special: "vein", veinTypeId: "copper_vein_small" },
          { row: 1, col: 1, blockTypeId: "stone" }
        ]
      },
      "player-3"
    );

    expect(mine.blocks[0]?.[0]).toMatchObject({ blockTypeId: "dirt", hpMultiplier: 1 });
    expect(mine.blocks[0]?.[1]).toMatchObject({
      blockTypeId: "stone",
      hp: 77,
      hpMultiplier: 1.5,
      rewardChestTypeId: "wooden_completion_chest",
      special: "reward_chest"
    });
    expect(mine.blocks[1]?.[0]).toMatchObject({
      blockTypeId: "copper_ore",
      hpMultiplier: 2,
      special: "vein",
      veinTypeId: "copper_vein_small"
    });
  });
});
