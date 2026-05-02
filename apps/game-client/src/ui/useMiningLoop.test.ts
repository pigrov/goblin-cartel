import type { ContentBundle } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";
import { describe, expect, it } from "vitest";
import { createDepthProgressRewards, createPlatformDropEvent } from "./useMiningLoop";

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
