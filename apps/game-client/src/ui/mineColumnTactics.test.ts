import type { GoblinConfig } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";
import { describe, expect, it } from "vitest";
import { createMineColumnTacticHints } from "./mineColumnTactics";
import type { RuntimeGoblinConfig } from "./goblinRuntimeUnits";

describe("mine column tactics", () => {
  it("marks empty columns with their best available miner dps", () => {
    const hints = createMineColumnTacticHints({
      currentPlatformRow: 0,
      goblinPlacements: {},
      labels: {
        "goblin.gold.name": "Крикк",
        "goblin.gold.nickname": "Золотой Нюх"
      },
      miningGoblins: [
        createGoblin("plain", { strength: 10 }),
        createGoblin("gold", {
          effects: [{ type: "damage_bonus_by_tag", tag: "gold", value: 1 }],
          nicknameKey: "goblin.gold.nickname",
          strength: 10
        })
      ],
      roster: { hiredGoblinIds: ["plain", "gold"] },
      session: createSession()
    });

    expect(hints[1]).toMatchObject({
      bestGoblinId: "gold",
      bestGoblinName: "Крикк Золотой Нюх",
      col: 1,
      currentDps: 0,
      hasTagBonus: true,
      state: "empty"
    });
    expect(hints[1]?.label).toMatch(/\/с$/u);
  });

  it("shows weak placement when another miner is much better for block tags", () => {
    const hints = createMineColumnTacticHints({
      currentPlatformRow: 0,
      goblinPlacements: { plain: 1 },
      labels: {},
      miningGoblins: [
        createGoblin("plain", { strength: 10 }),
        createGoblin("gold", {
          effects: [{ type: "damage_bonus_by_tag", tag: "gold", value: 1 }],
          strength: 10
        })
      ],
      roster: { hiredGoblinIds: ["plain", "gold"] },
      session: createSession()
    });

    expect(hints[1]).toMatchObject({
      bestGoblinId: "gold",
      col: 1,
      currentGoblinId: "plain",
      state: "weak"
    });
    expect(hints[1]?.currentDps).toBeLessThan(hints[1]?.bestDps ?? 0);
  });

  it("marks a column as best when the placed miner matches the block", () => {
    const hints = createMineColumnTacticHints({
      currentPlatformRow: 0,
      goblinPlacements: { gold: 1 },
      labels: {},
      miningGoblins: [
        createGoblin("plain", { strength: 10 }),
        createGoblin("gold", {
          effects: [{ type: "damage_bonus_by_tag", tag: "gold", value: 1 }],
          strength: 10
        })
      ],
      roster: { hiredGoblinIds: ["plain", "gold"] },
      session: createSession()
    });

    expect(hints[1]).toMatchObject({
      bestGoblinId: "gold",
      currentGoblinId: "gold",
      state: "best"
    });
  });
});

function createSession(): MiningSession {
  return {
    blocks: [
      [
        { blockTypeId: "rock", col: 0, destroyed: false, hp: 20, maxHp: 20, row: 0, tags: ["rock"] },
        { blockTypeId: "gold", col: 1, destroyed: false, hp: 20, maxHp: 20, row: 0, tags: ["rock", "gold"] }
      ]
    ],
    mine: {
      depthMeters: 1,
      height: 1,
      seed: "test",
      templateId: "test_mine",
      width: 2
    }
  } as unknown as MiningSession;
}

function createGoblin(
  id: string,
  options: {
    effects?: GoblinConfig["ability"]["effects"];
    nicknameKey?: string;
    strength: number;
  }
): RuntimeGoblinConfig {
  return {
    ability: {
      descriptionKey: `ability.${id}.description`,
      effects: options.effects ?? [],
      id: `ability_${id}`,
      nameKey: `ability.${id}.name`
    },
    assetId: `asset_${id}`,
    baseStats: {
      loyalty: 1,
      luck: 1,
      speed: 4,
      strength: options.strength
    },
    class: "miner",
    clan: "neutral",
    descriptionKey: `goblin.${id}.description`,
    hireCost: [],
    id,
    instanceLevel: 1,
    leveling: {
      cost: [],
      maxLevel: 5,
      statGrowthPerLevel: {
        loyalty: 0,
        luck: 0,
        speed: 0,
        strength: 0
      }
    },
    nameKey: `goblin.${id}.name`,
    nicknameKey: options.nicknameKey,
    rarity: "common",
    sortOrder: id === "plain" ? 1 : 2,
    unlockRequirements: []
  } as unknown as RuntimeGoblinConfig;
}
