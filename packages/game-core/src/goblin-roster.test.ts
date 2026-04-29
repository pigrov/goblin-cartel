import { describe, expect, it } from "vitest";
import {
  calculateCrewAutoDamagePerSecond,
  calculateCrewHitDamage,
  canHireGoblin,
  createInitialGoblinRoster,
  hireGoblin,
  normalizeGoblinRoster,
  type GoblinRosterGoblin
} from "./goblin-roster";

const goblins: GoblinRosterGoblin[] = [
  {
    id: "starter_miner",
    class: "miner",
    baseStats: {
      strength: 8,
      speed: 4,
      luck: 1,
      loyalty: 5
    },
    ability: {
      id: "stone_biter",
      effects: [{ type: "damage_bonus_by_tag", tag: "rock", value: 0.25 }]
    },
    hireCost: [],
    unlockRequirements: [],
    sortOrder: 10
  },
  {
    id: "second_miner",
    class: "miner",
    baseStats: {
      strength: 5,
      speed: 4,
      luck: 1,
      loyalty: 4
    },
    ability: {
      id: "cheap_shift",
      effects: [{ type: "base_damage_bonus", value: 2 }]
    },
    hireCost: [{ resourceId: "gold", amount: 100 }],
    unlockRequirements: [],
    sortOrder: 20
  },
  {
    id: "foreman",
    class: "foreman",
    baseStats: {
      strength: 4,
      speed: 6,
      luck: 2,
      loyalty: 8
    },
    ability: {
      id: "no_idle_picks",
      effects: [{ type: "auto_select_next_block", enabled: true }]
    },
    hireCost: [{ resourceId: "gold", amount: 300 }],
    unlockRequirements: [{ type: "goblins_by_class", class: "miner", count: 2 }],
    sortOrder: 30
  }
];

describe("goblin roster", () => {
  it("starts with the first free goblin hired", () => {
    expect(createInitialGoblinRoster(goblins)).toEqual({
      hiredGoblinIds: ["starter_miner"]
    });
  });

  it("normalizes unknown and duplicate hired goblins", () => {
    expect(
      normalizeGoblinRoster(
        {
          hiredGoblinIds: ["starter_miner", "missing", "starter_miner", "second_miner"]
        },
        goblins
      )
    ).toEqual({
      hiredGoblinIds: ["starter_miner", "second_miner"]
    });
  });

  it("calculates crew hit damage with block tag bonuses", () => {
    const damage = calculateCrewHitDamage({
      baseDamage: 20,
      blockTags: ["rock"],
      goblins,
      roster: {
        hiredGoblinIds: ["starter_miner", "second_miner"]
      }
    });

    expect(damage).toBe(42);
  });

  it("calculates crew auto damage per second without boss damage", () => {
    expect(
      calculateCrewAutoDamagePerSecond({
        blockTags: ["rock"],
        goblins,
        roster: {
          hiredGoblinIds: ["starter_miner", "second_miner"]
        }
      })
    ).toBe(7);

    expect(
      calculateCrewAutoDamagePerSecond({
        goblins,
        roster: {
          hiredGoblinIds: []
        }
      })
    ).toBe(0);
  });


  it("hires unlocked goblin and deducts resources", () => {
    const result = hireGoblin({
      goblinId: "second_miner",
      goblins,
      roster: {
        hiredGoblinIds: ["starter_miner"]
      },
      resources: {
        gold: 120,
        stone: 5
      }
    });

    expect(result).toEqual({
      ok: true,
      roster: {
        hiredGoblinIds: ["starter_miner", "second_miner"]
      },
      resources: {
        gold: 20,
        stone: 5
      }
    });
  });

  it("keeps class-locked goblins unavailable until requirements are met", () => {
    expect(
      canHireGoblin({
        goblin: goblins[2] as GoblinRosterGoblin,
        goblins,
        resources: {
          gold: 500
        },
        roster: {
          hiredGoblinIds: ["starter_miner"]
        }
      })
    ).toBe(false);

    expect(
      canHireGoblin({
        goblin: goblins[2] as GoblinRosterGoblin,
        goblins,
        resources: {
          gold: 500
        },
        roster: {
          hiredGoblinIds: ["starter_miner", "second_miner"]
        }
      })
    ).toBe(true);
  });

  it("rejects hire when resources are missing", () => {
    expect(
      hireGoblin({
        goblinId: "second_miner",
        goblins,
        roster: {
          hiredGoblinIds: ["starter_miner"]
        },
        resources: {
          gold: 50
        }
      })
    ).toEqual({
      ok: false,
      reason: "not_enough_resources"
    });
  });
});
