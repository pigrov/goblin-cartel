import { describe, expect, it } from "vitest";
import { openRewardChest, type RewardChestType } from "./reward-chests";

const chestType: RewardChestType = {
  id: "wooden_completion_chest",
  rewardTable: [
    { resourceId: "gold", min: 10, max: 12, chance: 1 },
    { resourceId: "stone", min: 3, max: 3, chance: 0.5 },
    { resourceId: "gold", min: 1, max: 1, chance: 1 }
  ]
};

describe("reward chests", () => {
  it("rolls reward amounts and merges same resources", () => {
    const randomValues = [0, 0.5, 0.1, 0];
    const result = openRewardChest({
      chestType,
      random: () => randomValues.shift() ?? 0
    });

    expect(result).toEqual({
      chestTypeId: "wooden_completion_chest",
      rewards: {
        gold: 12,
        stone: 3
      }
    });
  });

  it("skips rewards when chance roll fails", () => {
    const result = openRewardChest({
      chestType: {
        id: "iron_completion_chest",
        rewardTable: [{ resourceId: "copper_ore", min: 4, max: 8, chance: 0.25 }]
      },
      random: () => 0.9
    });

    expect(result.rewards).toEqual({});
  });
});
