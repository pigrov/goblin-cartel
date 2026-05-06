import { describe, expect, it } from "vitest";
import type { MiningSession } from "@goblin-cartel/game-core";
import { createMineColumnTacticHints } from "./mineColumnTactics";
import type { RuntimeGoblinConfig } from "./goblinRuntimeUnits";

describe("mine column tactics", () => {
  it("marks the best miner by power stat for each open column", () => {
    const weak = createMiner("goblin:miner:1", 5);
    const strong = createMiner("goblin:miner:2", 9);
    const hints = createMineColumnTacticHints({
      currentPlatformRow: 0,
      goblinPlacements: { [weak.id]: 0 },
      labels: { "goblin.miner.name": "Шахтер" },
      miningGoblins: [weak, strong],
      roster: {
        hiredGoblinIds: [weak.id, strong.id],
        instances: [
          { equipment: [], goblinId: "miner", id: weak.id, level: 1, lifetimeStats: {}, role: "miner", stars: 0 },
          { equipment: [], goblinId: "miner", id: strong.id, level: 1, lifetimeStats: {}, role: "miner", stars: 0 }
        ]
      },
      session: createSession()
    });

    expect(hints).toHaveLength(2);
    expect(hints[0]).toMatchObject({ bestDps: 9, currentDps: 5, state: "weak" });
    expect(hints[1]).toMatchObject({ bestGoblinId: strong.id, currentDps: 0, state: "empty" });
  });
});

function createMiner(id: string, statValue: number): RuntimeGoblinConfig {
  return {
    assetId: "asset_miner",
    descriptionKey: "goblin.miner.description",
    hireCost: [],
    id,
    instanceId: id,
    instanceLevel: 1,
    instanceStars: 0,
    levels: [
      {
        level: 1,
        stars: [0, 1, 2, 3, 4, 5].map((stars) => ({
          modifiers: [],
          stars: stars as 0 | 1 | 2 | 3 | 4 | 5,
          statValue,
          upgradeCost: []
        }))
      }
    ],
    nameKey: "goblin.miner.name",
    role: "miner",
    sortOrder: 1,
    sourceGoblinId: "miner",
    statKey: "power",
    statNameKey: "goblin.stat.power",
    unlockRequirements: []
  };
}

function createSession(): MiningSession {
  const blocks = [
    [
      { blockTypeId: "stone", col: 0, destroyed: false, hp: 10, maxHp: 10, row: 0, specialBehavior: "none" as const, tags: ["rock"] },
      { blockTypeId: "stone", col: 1, destroyed: false, hp: 10, maxHp: 10, row: 0, specialBehavior: "none" as const, tags: ["rock"] }
    ]
  ];

  return {
    blocks,
    destroyedBlocks: 0,
    foundVeins: [],
    lastFoundVein: null,
    lastRewards: {},
    mine: { blocks: [], depthMeters: 1, height: 1, seed: "seed", templateId: "mine", width: 2 },
    resources: {}
  };
}
