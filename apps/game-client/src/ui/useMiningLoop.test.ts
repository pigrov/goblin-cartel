import type { ContentBundle } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";
import { describe, expect, it } from "vitest";
import {
  clearOfflineSummaryPendingFinalHit,
  createDepthProgressRewards,
  createPlatformDropEvent,
  isPendingOfflineFinalHitActive
} from "./useMiningLoop";

describe("useMiningLoop platform drop events", () => {
  it("reports gained meters and total depth for row drops", () => {
    const event = createPlatformDropEvent(createSessionShape(10, 60), 1, 3);

    expect(event).toMatchObject({
      fromRow: 1,
      toRow: 3,
      metersGained: 12,
      depthMeters: 24,
      totalDepthMeters: 60,
      rewardDrops: [],
      rewards: {}
    });
  });

  it("calculates content-driven rewards for gained meters", () => {
    const rewards = createDepthProgressRewards(
      {
        mineTemplates: [
          {
            depthProgressReward: {
              amountPerMeter: 3,
              maxAmount: 10,
              multiplier: 1.5,
              resourceId: "stone"
            },
            id: "test-mine"
          }
        ]
      } as unknown as ContentBundle,
      "test-mine",
      3
    );

    expect(rewards).toEqual({ stone: 10 });
  });

  it("detects stale pending offline final hits", () => {
    const session = createSessionShape(1, 1);
    session.blocks = [
      [
        { col: 0, destroyed: false, hp: 1, row: 0 },
        { col: 1, destroyed: true, hp: 0, row: 0 }
      ]
    ] as MiningSession["blocks"];

    expect(isPendingOfflineFinalHitActive(session, { row: 0, col: 0 })).toBe(true);
    expect(isPendingOfflineFinalHitActive(session, { row: 0, col: 1 })).toBe(false);
    expect(isPendingOfflineFinalHitActive(session, { row: 9, col: 9 })).toBe(false);
    expect(isPendingOfflineFinalHitActive(session, null)).toBe(false);
  });

  it("clears pending flag from offline summary without losing rewards", () => {
    expect(
      clearOfflineSummaryPendingFinalHit({
        destroyedBlocks: 2,
        pendingFinalHit: true,
        relocationMoves: 1,
        rewards: { gold: 4 },
        seconds: 60
      })
    ).toEqual({
      destroyedBlocks: 2,
      pendingFinalHit: false,
      relocationMoves: 1,
      rewards: { gold: 4 },
      seconds: 60
    });

    expect(
      clearOfflineSummaryPendingFinalHit({
        destroyedBlocks: 0,
        pendingFinalHit: true,
        relocationMoves: 0,
        rewards: {},
        seconds: 60
      })
    ).toBeNull();
  });
});

function createSessionShape(height: number, depthMeters: number): MiningSession {
  return {
    blocks: [],
    destroyedBlocks: 0,
    foundVeins: [],
    lastFoundVein: null,
    lastRewards: {},
    mine: {
      blocks: [],
      depthMeters,
      height,
      seed: "test-seed",
      templateId: "test-mine",
      width: 7
    },
    resources: {}
  };
}
