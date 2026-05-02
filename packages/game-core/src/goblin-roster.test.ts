import { describe, expect, it } from "vitest";
import {
  calculateCrewAutoDamagePerSecond,
  calculateCrewHitDamage,
  calculateGoblinEffectiveAbilityEffects,
  calculateGoblinHireCost,
  calculateGoblinHitDamage,
  calculateGoblinUpgradeCost,
  canHireGoblin,
  createInitialGoblinRoster,
  getGoblinHutLevel,
  getGoblinLevel,
  hireGoblin,
  normalizeGoblinRoster,
  upgradeGoblin,
  upgradeGoblinHut,
  type GoblinHutConfig,
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
    leveling: {
      autoCollectSlotsPerLevel: 0,
      cost: [{ resourceId: "gold", baseAmount: 80, levelMultiplier: 1, levelPower: 1 }],
      maxLevel: 3,
      mineCapacityMultiplierPerLevel: 0,
      mineProductionMultiplierPerLevel: 0,
      statGrowthPerLevel: {
        loyalty: 0,
        luck: 0,
        speed: 1,
        strength: 2
      }
    },
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
      effects: [
        { type: "auto_select_next_block", enabled: true },
        { type: "offline_relocation_slots", value: 1 },
        { type: "offline_auto_damage_multiplier", value: 1.1 },
        { type: "offline_reward_multiplier", value: 1.05 },
        { type: "build_time_multiplier", value: 0.9 }
      ]
    },
    hireCost: [{ resourceId: "gold", amount: 300 }],
    leveling: {
      autoCollectSlotsPerLevel: 0,
      buildCostMultiplierPerLevel: 0,
      buildTimeMultiplierPerLevel: 0.02,
      cost: [{ resourceId: "gold", baseAmount: 120, levelMultiplier: 1, levelPower: 1 }],
      maxLevel: 4,
      mineCapacityMultiplierPerLevel: 0,
      mineProductionMultiplierPerLevel: 0,
      offlineRelocationSlotsPerLevel: 1,
      statGrowthPerLevel: {
        loyalty: 1,
        luck: 0,
        speed: 1,
        strength: 0
      }
    },
    unlockRequirements: [{ type: "goblins_by_class", class: "miner", count: 2 }],
    sortOrder: 30
  }
];

const goblinHut: GoblinHutConfig = {
  levels: [
    {
      hireCostMultiplier: 1,
      level: 1,
      maxHiredGoblins: 2,
      unlockedClasses: ["miner"],
      upgradeCost: [],
      upgradeCostMultiplier: 1,
      unlockRequirements: []
    },
    {
      hireCostMultiplier: 0.9,
      level: 2,
      maxHiredGoblins: 4,
      unlockedClasses: ["miner", "foreman"],
      upgradeCost: [{ amount: 100, resourceId: "gold" }],
      upgradeCostMultiplier: 0.8,
      unlockRequirements: [{ type: "built_mines_count", value: 1 }]
    }
  ]
};

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
          goblinLevels: {
            missing: 9,
            second_miner: 2,
            starter_miner: 5
          },
          hiredGoblinIds: ["starter_miner", "missing", "starter_miner", "second_miner"]
        },
        goblins
      )
    ).toEqual({
      goblinLevels: {
        second_miner: 2
      },
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

  it("uses hut level for hire limits, role unlocks, and hire discounts", () => {
    const extraMiner = { ...(goblins[1] as GoblinRosterGoblin), id: "extra_miner" };

    expect(
      canHireGoblin({
        goblin: goblins[2] as GoblinRosterGoblin,
        goblinHut,
        goblins,
        resources: {
          gold: 500
        },
        roster: {
          hiredGoblinIds: ["starter_miner", "second_miner"]
        }
      })
    ).toBe(false);

    expect(
      hireGoblin({
        goblinId: "extra_miner",
        goblinHut,
        goblins: [...goblins, extraMiner],
        resources: {
          gold: 500
        },
        roster: {
          hiredGoblinIds: ["starter_miner", "second_miner"]
        }
      })
    ).toEqual({
      ok: false,
      reason: "hut_limit"
    });

    const result = hireGoblin({
      goblinId: "foreman",
      goblinHut,
      goblins,
      resources: {
        gold: 300
      },
      roster: {
        hiredGoblinIds: ["starter_miner", "second_miner"],
        hutLevel: 2
      }
    });

    expect(calculateGoblinHireCost(goblins[2] as GoblinRosterGoblin, { hiredGoblinIds: [], hutLevel: 2 }, goblinHut)).toEqual([
      { amount: 270, resourceId: "gold" }
    ]);
    expect(result).toEqual({
      ok: true,
      resources: {
        gold: 30
      },
      roster: {
        hiredGoblinIds: ["starter_miner", "second_miner", "foreman"],
        hutLevel: 2
      }
    });
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

  it("upgrades hired goblins and deducts level-scaled cost", () => {
    const result = upgradeGoblin({
      goblinId: "second_miner",
      goblins,
      resources: {
        gold: 100
      },
      roster: {
        hiredGoblinIds: ["starter_miner", "second_miner"]
      }
    });

    expect(result).toEqual({
      ok: true,
      cost: [{ amount: 80, resourceId: "gold" }],
      resources: {
        gold: 20
      },
      roster: {
        goblinLevels: {
          second_miner: 2
        },
        hiredGoblinIds: ["starter_miner", "second_miner"]
      }
    });
  });

  it("upgrades the hut and applies its upgrade discount to goblin leveling", () => {
    expect(
      upgradeGoblinHut({
        builtMinesCount: 0,
        goblinHut,
        goblins,
        resources: {
          gold: 200
        },
        roster: {
          hiredGoblinIds: ["starter_miner"]
        }
      })
    ).toEqual({
      cost: [{ amount: 100, resourceId: "gold" }],
      ok: false,
      reason: "locked"
    });

    const hutUpgrade = upgradeGoblinHut({
      builtMinesCount: 1,
      goblinHut,
      goblins,
      resources: {
        gold: 200
      },
      roster: {
        hiredGoblinIds: ["starter_miner"]
      }
    });

    expect(hutUpgrade).toEqual({
      cost: [{ amount: 100, resourceId: "gold" }],
      ok: true,
      resources: {
        gold: 100
      },
      roster: {
        hiredGoblinIds: ["starter_miner"],
        hutLevel: 2
      }
    });
    expect(getGoblinHutLevel(hutUpgrade.ok ? hutUpgrade.roster : { hiredGoblinIds: [] })).toBe(2);
    expect(calculateGoblinUpgradeCost(goblins[1] as GoblinRosterGoblin, 1, goblinHut, 2)).toEqual([
      { amount: 64, resourceId: "gold" }
    ]);
  });

  it("rejects goblin upgrades when locked by roster, level, or resources", () => {
    expect(
      upgradeGoblin({
        goblinId: "second_miner",
        goblins,
        resources: {
          gold: 500
        },
        roster: {
          hiredGoblinIds: ["starter_miner"]
        }
      })
    ).toEqual({
      ok: false,
      cost: [],
      reason: "not_hired"
    });

    expect(
      upgradeGoblin({
        goblinId: "second_miner",
        goblins,
        resources: {
          gold: 10
        },
        roster: {
          hiredGoblinIds: ["starter_miner", "second_miner"]
        }
      })
    ).toEqual({
      ok: false,
      cost: [{ amount: 80, resourceId: "gold" }],
      reason: "not_enough_resources"
    });

    expect(
      upgradeGoblin({
        goblinId: "second_miner",
        goblins,
        resources: {
          gold: 500
        },
        roster: {
          goblinLevels: {
            second_miner: 3
          },
          hiredGoblinIds: ["starter_miner", "second_miner"]
        }
      })
    ).toEqual({
      ok: false,
      cost: [],
      reason: "max_level"
    });
  });

  it("applies level growth to damage and ability effects", () => {
    const leveledRoster = {
      goblinLevels: {
        second_miner: 3
      },
      hiredGoblinIds: ["second_miner"]
    };

    expect(getGoblinLevel(leveledRoster, "second_miner")).toBe(3);
    expect(calculateGoblinUpgradeCost(goblins[1] as GoblinRosterGoblin, 2)).toEqual([{ amount: 160, resourceId: "gold" }]);
    expect(calculateGoblinHitDamage(goblins[1] as GoblinRosterGoblin, [], 1)).toBe(9);
    expect(calculateGoblinHitDamage(goblins[1] as GoblinRosterGoblin, [], 3)).toBe(14);
    expect(
      calculateCrewAutoDamagePerSecond({
        goblins,
        roster: leveledRoster
      })
    ).toBe(4);
    expect(calculateGoblinEffectiveAbilityEffects(goblins[1] as GoblinRosterGoblin, 3)).toEqual([
      { type: "base_damage_bonus", value: 2 }
    ]);
  });

  it("applies level growth to construction multipliers", () => {
    expect(calculateGoblinEffectiveAbilityEffects(goblins[2] as GoblinRosterGoblin, 3)).toEqual([
      { type: "auto_select_next_block", enabled: true },
      { type: "offline_relocation_slots", value: 3 },
      { type: "offline_auto_damage_multiplier", value: 1.1 },
      { type: "offline_reward_multiplier", value: 1.05 },
      { type: "build_time_multiplier", value: 0.86 }
    ]);
  });
});
