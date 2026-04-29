import { describe, expect, it } from "vitest";
import { generateMine, type MineTemplate } from "./mine-generator";
import {
  applyAutoMining,
  applyColumnAutoMining,
  createMiningSession,
  exportMiningSessionSave,
  hitMineBlock,
  restoreMiningSession,
  type MiningBlockType
} from "./mining-session";

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

  it("exports and restores damaged blocks and resources", () => {
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
      col: 1,
      damage: 10,
      random: () => 0
    });

    const save = exportMiningSessionSave(destroyed);
    const restored = restoreMiningSession(createMiningSession({ mine, blockTypes }), save);

    expect(save.blocks).toEqual([
      { row: 0, col: 0, hp: 5, destroyed: false },
      { row: 0, col: 1, hp: 0, destroyed: true }
    ]);
    expect(restored.blocks[0]?.[0]?.hp).toBe(5);
    expect(restored.blocks[0]?.[1]?.destroyed).toBe(true);
    expect(restored.resources).toEqual({ stone: 2 });
    expect(restored.destroyedBlocks).toBe(1);
  });

  it("applies auto mining across blocks and collects rewards", () => {
    const mine = generateMine(template, "player-1");
    const session = createMiningSession({ mine, blockTypes });

    const result = applyAutoMining(session, blockTypes, {
      startCell: { row: 0, col: 0 },
      damage: 25,
      random: () => 0
    });

    expect(result.report).toEqual({
      damageApplied: 25,
      destroyedBlocks: 2,
      rewards: { stone: 4 },
      pendingFinalHit: null
    });
    expect(result.session.blocks[0]?.[0]?.destroyed).toBe(true);
    expect(result.session.blocks[0]?.[1]?.destroyed).toBe(true);
    expect(result.session.blocks[1]?.[0]?.hp).toBe(5);
    expect(result.nextTargetCell).toEqual({ row: 1, col: 0 });
  });

  it("can hold the last offline destroy at one hp for a visible final hit", () => {
    const mine = generateMine(template, "player-1");
    const session = createMiningSession({ mine, blockTypes });

    const result = applyAutoMining(session, blockTypes, {
      startCell: { row: 0, col: 0 },
      damage: 25,
      holdLastDestroy: true,
      random: () => 0
    });

    expect(result.report).toEqual({
      damageApplied: 19,
      destroyedBlocks: 1,
      rewards: { stone: 2 },
      pendingFinalHit: { row: 0, col: 1 }
    });
    expect(result.session.blocks[0]?.[0]?.destroyed).toBe(true);
    expect(result.session.blocks[0]?.[1]).toMatchObject({
      hp: 1,
      destroyed: false
    });
    expect(result.session.blocks[1]?.[0]?.hp).toBe(10);
    expect(result.nextTargetCell).toEqual({ row: 0, col: 1 });
  });

  it("applies auto mining only inside the selected column", () => {
    const mine = generateMine(template, "player-1");
    const session = createMiningSession({ mine, blockTypes });

    const result = applyColumnAutoMining(session, blockTypes, {
      column: 0,
      damage: 25,
      random: () => 0
    });

    expect(result.report).toEqual({
      damageApplied: 20,
      destroyedBlocks: 2,
      rewards: { stone: 4 },
      pendingFinalHit: null
    });
    expect(result.session.blocks[0]?.[0]?.destroyed).toBe(true);
    expect(result.session.blocks[1]?.[0]?.destroyed).toBe(true);
    expect(result.session.blocks[0]?.[1]?.destroyed).toBe(false);
    expect(result.nextTargetCell).toEqual({ row: 1, col: 0 });
  });

  it("can hold the last column destroy at one hp", () => {
    const mine = generateMine(template, "player-1");
    const session = createMiningSession({ mine, blockTypes });

    const result = applyColumnAutoMining(session, blockTypes, {
      column: 0,
      damage: 25,
      holdLastDestroy: true,
      random: () => 0
    });

    expect(result.report).toEqual({
      damageApplied: 19,
      destroyedBlocks: 1,
      rewards: { stone: 2 },
      pendingFinalHit: { row: 1, col: 0 }
    });
    expect(result.session.blocks[0]?.[0]?.destroyed).toBe(true);
    expect(result.session.blocks[1]?.[0]).toMatchObject({
      hp: 1,
      destroyed: false
    });
    expect(result.session.blocks[0]?.[1]?.hp).toBe(10);
    expect(result.nextTargetCell).toEqual({ row: 1, col: 0 });
  });

  it("rejects save for another mine", () => {
    const mine = generateMine(template, "player-1");
    const session = createMiningSession({ mine, blockTypes });

    expect(() =>
      restoreMiningSession(session, {
        mineTemplateId: "another_mine",
        seed: "player-1",
        resources: {},
        blocks: []
      })
    ).toThrow("Mining save does not match current mine");
  });
});
