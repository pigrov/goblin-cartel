import { describe, expect, it } from "vitest";
import {
  calculateCrewAutoDamagePerSecond,
  calculateCrewHitDamage,
  calculateGoblinEffectiveAbilityEffects,
  calculateGoblinHireCost,
  calculateGoblinHitDamage,
  calculateGoblinUpgradeCost,
  canHireGoblin,
  createGoblinTemplateInstance,
  createInitialGoblinRoster,
  ensureGoblinRosterInstances,
  getHiredGoblinCount,
  getGoblinHutLevel,
  getGoblinLevel,
  hireGoblin,
  hireRandomGoblin,
  normalizeGoblinRoster,
  rollGoblinInstance,
  upgradeGoblin,
  upgradeGoblinHut,
  type GoblinGenerationArchetypeConfig,
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

  it("creates stable instances for already hired template goblins", () => {
    expect(
      ensureGoblinRosterInstances(
        {
          goblinLevels: {
            second_miner: 2
          },
          hiredGoblinIds: ["starter_miner", "second_miner"]
        },
        goblins
      )
    ).toMatchObject({
      goblinLevels: {
        second_miner: 2
      },
      hiredGoblinIds: ["starter_miner", "second_miner"],
      instances: [
        {
          class: "miner",
          id: "template:starter_miner",
          level: 1,
          rarity: "common",
          rolledStats: {
            loyalty: 5,
            luck: 1,
            speed: 4,
            strength: 8
          },
          templateId: "starter_miner"
        },
        {
          class: "miner",
          id: "template:second_miner",
          level: 2,
          rarity: "common",
          rolledStats: {
            loyalty: 4,
            luck: 1,
            speed: 4,
            strength: 5
          },
          templateId: "second_miner"
        }
      ]
    });
  });

  it("normalizes existing instances and preserves rolled stats", () => {
    const roster = normalizeGoblinRoster(
      {
        hiredGoblinIds: ["second_miner"],
        instances: [
          {
            class: "collector",
            equipment: [{ itemId: "rusty_pickaxe", slot: "tool" }],
            id: "rolled:abc",
            level: 99,
            lifetimeStats: {
              blocksDestroyed: 12,
              resourcesCollected: {
                gold: 7
              }
            },
            rarity: "legendary",
            rolledStats: {
              loyalty: 9,
              luck: 5,
              speed: 8,
              strength: 11
            },
            templateId: "second_miner",
            traits: [{ id: "gold_nose" }]
          }
        ]
      },
      goblins
    );

    expect(roster.instances).toEqual([
      {
        class: "miner",
        equipment: [{ itemId: "rusty_pickaxe", slot: "tool" }],
        id: "rolled:abc",
        level: 3,
        lifetimeStats: {
          blocksDestroyed: 12,
          resourcesCollected: {
            gold: 7
          }
        },
        rarity: "legendary",
        rolledStats: {
          loyalty: 9,
          luck: 5,
          speed: 8,
          strength: 11
        },
        templateId: "second_miner",
        traits: [{ id: "gold_nose" }]
      }
    ]);
  });

  it("updates instances during hire and upgrade when roster has instance storage", () => {
    const hired = hireGoblin({
      goblinId: "second_miner",
      goblins,
      roster: ensureGoblinRosterInstances({ hiredGoblinIds: ["starter_miner"] }, goblins),
      resources: {
        gold: 120
      }
    });

    expect(hired.ok ? hired.roster.instances?.map((instance) => instance.templateId) : []).toEqual([
      "starter_miner",
      "second_miner"
    ]);

    const upgraded = hired.ok
      ? upgradeGoblin({
          goblinId: "second_miner",
          goblins,
          resources: {
            gold: 100
          },
          roster: hired.roster
        })
      : null;

    expect(upgraded?.ok ? upgraded.roster.instances?.find((instance) => instance.templateId === "second_miner")?.level : null).toBe(2);
  });

  it("can create a template-backed instance explicitly", () => {
    expect(createGoblinTemplateInstance(goblins[1] as GoblinRosterGoblin, 2, "manual-instance")).toMatchObject({
      class: "miner",
      id: "manual-instance",
      level: 2,
      rarity: "common",
      templateId: "second_miner"
    });
  });

  it("rolls deterministic random goblin instances from an archetype", () => {
    const archetype: GoblinGenerationArchetypeConfig = {
      class: "miner",
      id: "miner_contract",
      rarityWeights: [{ rarity: "epic", statMultiplier: 2, weight: 1 }],
      statRanges: {
        loyalty: { min: 4, max: 4 },
        luck: { min: 2, max: 2 },
        speed: { min: 3, max: 3 },
        strength: { min: 5, max: 5 }
      },
      templateGoblinId: "starter_miner",
      traitPool: [{ id: "stone_focus", weight: 1 }]
    };
    const input = {
      archetype,
      namePool: {
        names: ["Krikk"],
        nicknames: ["Stone Ear"]
      },
      seed: "player-1",
      sequence: 3,
      template: goblins[0] as GoblinRosterGoblin
    };

    expect(rollGoblinInstance(input)).toEqual(rollGoblinInstance(input));
    expect(rollGoblinInstance(input)).toMatchObject({
      class: "miner",
      level: 1,
      name: "Krikk",
      nickname: "Stone Ear",
      rarity: "epic",
      rolledStats: {
        loyalty: 8,
        luck: 4,
        speed: 6,
        strength: 10
      },
      templateId: "starter_miner",
      traits: [{ id: "stone_focus" }]
    });
    expect(rollGoblinInstance(input).id).toMatch(/^rolled:miner_contract:/u);
  });

  it("uses seed and sequence to roll different goblin instance ids", () => {
    const archetype: GoblinGenerationArchetypeConfig = {
      class: "miner",
      id: "miner contract",
      rarityWeights: [{ rarity: "common", weight: 1 }],
      statRanges: {
        loyalty: { min: 1, max: 3 },
        luck: { min: 1, max: 3 },
        speed: { min: 1, max: 3 },
        strength: { min: 1, max: 3 }
      },
      templateGoblinId: "starter_miner"
    };
    const first = rollGoblinInstance({
      archetype,
      namePool: { names: ["A"], nicknames: ["B"] },
      seed: "player-1",
      sequence: 0,
      template: goblins[0] as GoblinRosterGoblin
    });
    const second = rollGoblinInstance({
      archetype,
      namePool: { names: ["A"], nicknames: ["B"] },
      seed: "player-1",
      sequence: 1,
      template: goblins[0] as GoblinRosterGoblin
    });

    expect(first.id).not.toBe(second.id);
    expect(first.id).toMatch(/^rolled:miner_contract:/u);
  });

  it("hires a random goblin instance and keeps it separate from the template instance", () => {
    const archetype: GoblinGenerationArchetypeConfig = {
      class: "miner",
      hireCost: [{ amount: 50, resourceId: "gold" }],
      id: "miner_contract",
      rarityWeights: [{ rarity: "rare", statMultiplier: 1, weight: 1 }],
      statRanges: {
        loyalty: { min: 4, max: 4 },
        luck: { min: 3, max: 3 },
        speed: { min: 5, max: 5 },
        strength: { min: 7, max: 7 }
      },
      templateGoblinId: "starter_miner"
    };
    const result = hireRandomGoblin({
      archetypeId: "miner_contract",
      archetypes: [archetype],
      goblins,
      namePool: {
        names: ["Krikk"],
        nicknames: ["Stone Ear"]
      },
      resources: {
        gold: 100
      },
      roster: ensureGoblinRosterInstances({ hiredGoblinIds: ["starter_miner"] }, goblins),
      seed: "player-1"
    });

    expect(result.ok ? result.resources : null).toEqual({ gold: 50 });
    expect(result.ok ? result.instance : null).toMatchObject({
      class: "miner",
      name: "Krikk",
      nickname: "Stone Ear",
      rarity: "rare",
      templateId: "starter_miner"
    });
    expect(result.ok ? result.roster.hiredGoblinIds : []).toEqual([
      "starter_miner",
      expect.stringMatching(/^rolled:miner_contract:/u)
    ]);
    expect(result.ok ? result.roster.instances?.map((instance) => instance.id) : []).toEqual([
      "template:starter_miner",
      expect.stringMatching(/^rolled:miner_contract:/u)
    ]);
    expect(result.ok ? getHiredGoblinCount(result.roster) : 0).toBe(2);
  });

  it("blocks random goblin hire when hut limit, role, or resources prevent it", () => {
    const archetype: GoblinGenerationArchetypeConfig = {
      class: "foreman",
      hireCost: [{ amount: 50, resourceId: "gold" }],
      id: "foreman_contract",
      rarityWeights: [{ rarity: "common", weight: 1 }],
      statRanges: {
        loyalty: { min: 1, max: 1 },
        luck: { min: 1, max: 1 },
        speed: { min: 1, max: 1 },
        strength: { min: 1, max: 1 }
      },
      templateGoblinId: "foreman"
    };

    expect(
      hireRandomGoblin({
        archetypeId: "foreman_contract",
        archetypes: [archetype],
        goblinHut,
        goblins,
        namePool: { names: ["A"], nicknames: ["B"] },
        resources: { gold: 100 },
        roster: { hiredGoblinIds: ["starter_miner"] },
        seed: "player-1"
      })
    ).toMatchObject({ ok: false, reason: "role_locked" });

    expect(
      hireRandomGoblin({
        archetypeId: "foreman_contract",
        archetypes: [{ ...archetype, class: "miner", templateGoblinId: "starter_miner" }],
        goblinHut,
        goblins,
        namePool: { names: ["A"], nicknames: ["B"] },
        resources: { gold: 10 },
        roster: { hiredGoblinIds: ["starter_miner"], hutLevel: 2 },
        seed: "player-1"
      })
    ).toMatchObject({ ok: false, reason: "not_enough_resources" });

    expect(
      hireRandomGoblin({
        archetypeId: "foreman_contract",
        archetypes: [{ ...archetype, class: "miner", templateGoblinId: "starter_miner" }],
        goblinHut,
        goblins,
        namePool: { names: ["A"], nicknames: ["B"] },
        resources: { gold: 1000 },
        roster: ensureGoblinRosterInstances({ hiredGoblinIds: ["starter_miner", "second_miner"] }, goblins),
        seed: "player-1"
      })
    ).toMatchObject({ ok: false, reason: "hut_limit" });
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

  it("uses rolled instance stats for hired random goblin damage", () => {
    const roster = {
      hiredGoblinIds: ["rolled:miner_contract:1"],
      instances: [
        {
          class: "miner" as const,
          equipment: [],
          id: "rolled:miner_contract:1",
          level: 2,
          lifetimeStats: {},
          rarity: "rare" as const,
          rolledStats: {
            loyalty: 4,
            luck: 3,
            speed: 10,
            strength: 20
          },
          templateId: "second_miner",
          traits: []
        }
      ]
    };

    expect(getGoblinLevel(roster, "rolled:miner_contract:1")).toBe(2);
    expect(getGoblinLevel(roster, "second_miner")).toBe(1);
    expect(
      calculateCrewHitDamage({
        goblins,
        roster
      })
    ).toBe(30);
    expect(
      calculateCrewAutoDamagePerSecond({
        goblins,
        roster
      })
    ).toBe(10);
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

  it("upgrades a hired random goblin instance without leveling the template", () => {
    const result = upgradeGoblin({
      goblinId: "rolled:miner_contract:1",
      goblins,
      resources: {
        gold: 200
      },
      roster: {
        hiredGoblinIds: ["second_miner", "rolled:miner_contract:1"],
        instances: [
          {
            class: "miner",
            equipment: [],
            id: "template:second_miner",
            level: 1,
            lifetimeStats: {},
            rarity: "common",
            rolledStats: {
              loyalty: 4,
              luck: 1,
              speed: 4,
              strength: 5
            },
            templateId: "second_miner",
            traits: []
          },
          {
            class: "miner",
            equipment: [],
            id: "rolled:miner_contract:1",
            level: 2,
            lifetimeStats: {},
            rarity: "rare",
            rolledStats: {
              loyalty: 4,
              luck: 3,
              speed: 10,
              strength: 20
            },
            templateId: "second_miner",
            traits: []
          }
        ]
      }
    });

    expect(result).toMatchObject({
      ok: true,
      cost: [{ amount: 160, resourceId: "gold" }],
      resources: {
        gold: 40
      },
      roster: {
        hiredGoblinIds: ["second_miner", "rolled:miner_contract:1"],
        instances: [
          {
            id: "template:second_miner",
            level: 1
          },
          {
            id: "rolled:miner_contract:1",
            level: 3
          }
        ]
      }
    });
    expect(result.ok ? result.roster.goblinLevels : undefined).toBeUndefined();
    expect(result.ok ? getGoblinLevel(result.roster, "rolled:miner_contract:1") : 0).toBe(3);
    expect(result.ok ? getGoblinLevel(result.roster, "second_miner") : 0).toBe(1);
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
