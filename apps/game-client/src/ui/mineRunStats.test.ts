import type { ContentBundle } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";
import { describe, expect, it } from "vitest";
import {
  addMineRunBlockRewards,
  addMineRunDepthRewards,
  createMineRunCompletionStatsView,
  createMineRunProgressStatsView,
  createMineRunStats,
  restoreMineRunStats
} from "./mineRunStats";

describe("mineRunStats", () => {
  it("tracks block and depth rewards separately", () => {
    const stats = addMineRunDepthRewards(
      addMineRunBlockRewards(createMineRunStats("mine-1"), "mine-1", { gold: 4 }, 2),
      "mine-1",
      { stone: 7 }
    );

    expect(stats).toEqual({
      mineTemplateId: "mine-1",
      destroyedBlocks: 2,
      blockRewards: { gold: 4 },
      depthRewards: { stone: 7 }
    });
  });

  it("resets stale stats when the mine changes", () => {
    const stats = addMineRunBlockRewards(
      {
        mineTemplateId: "mine-1",
        destroyedBlocks: 4,
        blockRewards: { gold: 10 },
        depthRewards: { stone: 3 }
      },
      "mine-2",
      { copper_ore: 2 }
    );

    expect(stats).toEqual({
      mineTemplateId: "mine-2",
      destroyedBlocks: 1,
      blockRewards: { copper_ore: 2 },
      depthRewards: {}
    });
  });

  it("restores old saves without losing the session destroyed block count", () => {
    const stats = restoreMineRunStats(
      {
        mineTemplateId: "mine-1",
        destroyedBlocks: 3,
        blockRewards: { gold: 9, broken: -1 },
        depthRewards: { stone: 5 }
      },
      "mine-1",
      6
    );

    expect(stats).toEqual({
      mineTemplateId: "mine-1",
      destroyedBlocks: 6,
      blockRewards: { gold: 9 },
      depthRewards: { stone: 5 }
    });
  });

  it("creates sorted completion reward summaries", () => {
    const view = createMineRunCompletionStatsView(
      {
        mineTemplateId: "mine-1",
        destroyedBlocks: 1,
        blockRewards: { copper_ore: 2 },
        depthRewards: { gold: 5 }
      },
      createSessionShape(),
      createContentShape(),
      {
        "resource.copper.name": "Медь",
        "resource.gold.name": "Золото"
      }
    );

    expect(view).toMatchObject({
      depthMeters: 10,
      destroyedBlocks: 2,
      totalBlocks: 2,
      totalRewards: [
        { amount: 5, label: "Золото", resourceId: "gold" },
        { amount: 2, label: "Медь", resourceId: "copper_ore" }
      ]
    });
  });

  it("creates current mine progress details", () => {
    const view = createMineRunProgressStatsView(
      {
        mineTemplateId: "mine-1",
        destroyedBlocks: 1,
        blockRewards: {},
        depthRewards: {}
      },
      createSessionShape(),
      createContentShape(),
      {
        "resource.copper.name": "Медь",
        "resource.gold.name": "Золото",
        "vein.gold.name": "Золотая жила"
      },
      0
    );

    expect(view).toMatchObject({
      completionVeinName: "Золотая жила",
      currentDepthMeters: 5,
      depthRewardLabel: "+2.5 Золото/м, максимум 25",
      progressPercent: 100
    });
  });
});

function createContentShape(): ContentBundle {
  return {
    mineTemplates: [
      {
        depthProgressReward: {
          amountPerMeter: 2,
          maxAmount: 25,
          multiplier: 1.25,
          resourceId: "gold"
        },
        id: "mine-1"
      }
    ],
    resources: [
      {
        iconAssetId: "gold",
        id: "gold",
        nameKey: "resource.gold.name",
        rarity: "common",
        sortOrder: 10,
        storageType: "global"
      },
      {
        iconAssetId: "copper",
        id: "copper_ore",
        nameKey: "resource.copper.name",
        rarity: "common",
        sortOrder: 20,
        storageType: "global"
      }
    ],
    veinTypes: [
      {
        assetId: "gold-vein",
        id: "gold_vein_small",
        nameKey: "vein.gold.name",
        rarity: "common",
        resourceId: "gold"
      }
    ]
  } as unknown as ContentBundle;
}

function createSessionShape(): MiningSession {
  return {
    blocks: [
      [
        {
          blockTypeId: "stone",
          col: 0,
          destroyed: true,
          hp: 0,
          maxHp: 10,
          row: 0,
          specialBehavior: "none",
          tags: []
        }
      ],
      [
        {
          blockTypeId: "stone",
          col: 0,
          destroyed: true,
          hp: 0,
          maxHp: 10,
          row: 1,
          specialBehavior: "none",
          tags: []
        }
      ]
    ],
    destroyedBlocks: 2,
    foundVeins: [],
    lastFoundVein: null,
    lastRewards: {},
    mine: {
      blocks: [],
      depthMeters: 10,
      height: 2,
      seed: "seed",
      completionVeinTypeId: "gold_vein_small",
      templateId: "mine-1",
      width: 1
    },
    resources: {}
  };
}
