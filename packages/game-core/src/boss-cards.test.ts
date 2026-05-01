import { describe, expect, it } from "vitest";
import {
  applyBossCardBonuses,
  bossCardDefinitions,
  calculateBossCardUpgradeCost,
  createInitialBossCardState,
  normalizeBossCardState,
  upgradeBossCard
} from "./boss-cards";
import type { BossEnergyConfig } from "./boss-energy";

const baseConfig: BossEnergyConfig = {
  critChance: 0.12,
  critMultiplier: 2,
  damagePerTap: 18,
  energyPerHit: 18,
  maxEnergy: 600,
  regenPerSecond: 6
};

describe("boss cards", () => {
  it("calculates progressive card and elixir costs", () => {
    const hitDamage = bossCardDefinitions.find((card) => card.id === "hit_damage");

    if (!hitDamage) {
      throw new Error("Missing hit damage card");
    }

    expect(calculateBossCardUpgradeCost(hitDamage, createInitialBossCardState())).toEqual({
      cardAmount: 2,
      cardResourceId: "boss_card_hit_damage",
      elixirAmount: 8,
      elixirResourceId: "elixir"
    });
    expect(calculateBossCardUpgradeCost(hitDamage, { levels: { hit_damage: 2 } })).toMatchObject({
      cardAmount: 10,
      elixirAmount: 40
    });
  });

  it("supports content-authored card costs", () => {
    const hitDamage = bossCardDefinitions.find((card) => card.id === "hit_damage");

    if (!hitDamage) {
      throw new Error("Missing hit damage card");
    }

    const customCard = {
      ...hitDamage,
      elixirCostMultiplier: 3,
      elixirResourceId: "red_elixir",
      id: "custom_hit",
      upgradeCardAmounts: [1, 4]
    };

    expect(calculateBossCardUpgradeCost(customCard, { levels: { custom_hit: 1 } })).toEqual({
      cardAmount: 4,
      cardResourceId: "boss_card_hit_damage",
      elixirAmount: 12,
      elixirResourceId: "red_elixir"
    });
  });

  it("upgrades a card and deducts card copies with elixir", () => {
    const result = upgradeBossCard({
      cardId: "hit_damage",
      resources: {
        boss_card_hit_damage: 2,
        elixir: 9,
        gold: 100
      },
      state: createInitialBossCardState()
    });

    expect(result).toMatchObject({
      ok: true,
      resources: {
        boss_card_hit_damage: 0,
        elixir: 1,
        gold: 100
      },
      state: {
        levels: {
          hit_damage: 1
        }
      }
    });
  });

  it("rejects upgrades without cards or elixir", () => {
    expect(
      upgradeBossCard({
        cardId: "hit_damage",
        resources: { boss_card_hit_damage: 1, elixir: 100 },
        state: createInitialBossCardState()
      })
    ).toMatchObject({ ok: false, reason: "not_enough_cards" });
    expect(
      upgradeBossCard({
        cardId: "hit_damage",
        resources: { boss_card_hit_damage: 2, elixir: 7 },
        state: createInitialBossCardState()
      })
    ).toMatchObject({ ok: false, reason: "not_enough_elixir" });
  });

  it("applies card levels to boss energy config", () => {
    expect(
      applyBossCardBonuses(baseConfig, {
        levels: {
          crit_chance: 2,
          crit_multiplier: 1,
          hit_damage: 3,
          max_energy: 2
        }
      })
    ).toEqual({
      critChance: 0.15,
      critMultiplier: 2.12,
      damagePerTap: 30,
      energyPerHit: 18,
      maxEnergy: 690,
      regenPerSecond: 6
    });
  });

  it("normalizes unknown cards and impossible levels", () => {
    expect(
      normalizeBossCardState({
        levels: {
          crit_chance: -1,
          hit_damage: 99,
          max_energy: 2
        }
      })
    ).toEqual({
      levels: {
        hit_damage: 8,
        max_energy: 2
      }
    });
  });
});
