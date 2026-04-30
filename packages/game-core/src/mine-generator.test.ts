import { describe, expect, it } from "vitest";
import { generateMine, type MineTemplate } from "./mine-generator";

const template: MineTemplate = {
  id: "old_well_01",
  width: 2,
  height: 2,
  difficultyStart: 1,
  difficultyEnd: 2,
  cellMap: [
    { row: 0, col: 0, blockTypeId: "dirt" },
    { row: 0, col: 1, blockTypeId: "stone" },
    { row: 1, col: 0, blockTypeId: "stone" },
    { row: 1, col: 1, blockTypeId: "copper_ore" }
  ]
};

describe("mine generator", () => {
  it("is deterministic for authored cell maps", () => {
    expect(generateMine(template, "player-1")).toEqual(generateMine(template, "player-1"));
  });

  it("requires a complete authored cell map", () => {
    expect(() =>
      generateMine(
        {
          ...template,
          cellMap: template.cellMap.slice(0, -1)
        },
        "player-1"
      )
    ).toThrow("No cell configured for row 1 col 1");
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
          { row: 0, col: 1, blockTypeId: "stone", hp: 77, special: "reward_chest", rewardChestTypeId: "wooden_completion_chest" },
          { row: 1, col: 0, blockTypeId: "copper_ore" },
          { row: 1, col: 1, blockTypeId: "stone" }
        ]
      },
      "player-3"
    );

    expect(mine.blocks[0]?.[0]).toMatchObject({ blockTypeId: "dirt", difficultyMultiplier: 1 });
    expect(mine.blocks[0]?.[1]).toMatchObject({
      blockTypeId: "stone",
      difficultyMultiplier: 1,
      hp: 77,
      rewardChestTypeId: "wooden_completion_chest",
      special: "reward_chest"
    });
    expect(mine.blocks[1]?.[0]).toMatchObject({
      blockTypeId: "copper_ore",
      difficultyMultiplier: 2
    });
  });
});
