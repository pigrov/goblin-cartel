import { describe, expect, it } from "vitest";
import { generateMine, type MineTemplate } from "./mine-generator";
import { createMiningSession, hitMineBlock, type MiningBlockType } from "./mining-session";

const template: MineTemplate = {
  id: "old_well_01",
  width: 2,
  height: 2,
  strata: [
    {
      id: "top",
      fromRow: 0,
      toRow: 1,
      blockWeights: {
        dirt: 1
      }
    }
  ]
};

const blockTypes: MiningBlockType[] = [
  {
    id: "dirt",
    baseHp: 10,
    tags: ["soft"],
    rewardTable: [{ resourceId: "stone", min: 2, max: 4, chance: 1 }],
    specialBehavior: "none"
  }
];

describe("mining session", () => {
  it("creates block hp from generated mine and block types", () => {
    const mine = generateMine(template, "player-1");
    const session = createMiningSession({ mine, blockTypes });

    expect(session.blocks[0]?.[0]).toMatchObject({
      blockTypeId: "dirt",
      hp: 10,
      maxHp: 10,
      destroyed: false
    });
  });

  it("applies damage and rewards once when block is destroyed", () => {
    const mine = generateMine(template, "player-1");
    const session = createMiningSession({ mine, blockTypes });
    const damaged = hitMineBlock(session, blockTypes, {
      row: 0,
      col: 0,
      damage: 5,
      random: () => 0
    });
    const destroyed = hitMineBlock(damaged, blockTypes, {
      row: 0,
      col: 0,
      damage: 5,
      random: () => 0
    });
    const ignored = hitMineBlock(destroyed, blockTypes, {
      row: 0,
      col: 0,
      damage: 5,
      random: () => 0
    });

    expect(damaged.blocks[0]?.[0]?.hp).toBe(5);
    expect(damaged.resources).toEqual({});
    expect(destroyed.blocks[0]?.[0]?.destroyed).toBe(true);
    expect(destroyed.resources).toEqual({ stone: 2 });
    expect(ignored.resources).toEqual({ stone: 2 });
  });
});
