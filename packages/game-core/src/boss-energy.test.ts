import { describe, expect, it } from "vitest";
import {
  applyBossAttack,
  createBossEnergyState,
  getBossEnergySecondsUntilReady,
  regenerateBossEnergy,
  restoreBossEnergyState,
  type BossEnergyConfig
} from "./boss-energy";

const config: BossEnergyConfig = {
  maxEnergy: 100,
  energyPerHit: 25,
  regenPerSecond: 5,
  damagePerTap: 18,
  critChance: 0.25,
  critMultiplier: 2
};

describe("boss energy", () => {
  it("creates a full energy state", () => {
    expect(createBossEnergyState(config, 1000)).toEqual({
      currentEnergy: 100,
      updatedAt: 1000
    });
  });

  it("regenerates energy up to the max", () => {
    const state = regenerateBossEnergy(
      {
        currentEnergy: 40,
        updatedAt: 1000
      },
      config,
      9000
    );

    expect(state).toEqual({
      currentEnergy: 80,
      updatedAt: 9000
    });

    expect(regenerateBossEnergy(state, config, 20000).currentEnergy).toBe(100);
  });

  it("spends energy and returns normal tap damage", () => {
    const result = applyBossAttack(
      {
        currentEnergy: 40,
        updatedAt: 1000
      },
      config,
      {
        now: 1000,
        random: () => 0.9
      }
    );

    expect(result).toEqual({
      ok: true,
      state: {
        currentEnergy: 15,
        updatedAt: 1000
      },
      damage: 18,
      critical: false,
      energySpent: 25
    });
  });

  it("returns wait time when energy is missing", () => {
    const result = applyBossAttack(
      {
        currentEnergy: 10,
        updatedAt: 1000
      },
      config,
      {
        now: 1000
      }
    );

    expect(result).toEqual({
      ok: false,
      state: {
        currentEnergy: 10,
        updatedAt: 1000
      },
      energyMissing: 15,
      secondsUntilReady: 3
    });
    expect(getBossEnergySecondsUntilReady(result.state, config, 1000)).toBe(3);
  });

  it("applies critical tap damage", () => {
    const result = applyBossAttack(
      {
        currentEnergy: 100,
        updatedAt: 1000
      },
      config,
      {
        now: 1000,
        random: () => 0.1
      }
    );

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.damage).toBe(36);
      expect(result.critical).toBe(true);
    }
  });

  it("restores saved energy with elapsed regeneration", () => {
    expect(
      restoreBossEnergyState(
        {
          currentEnergy: 20,
          updatedAt: 1000
        },
        config,
        5000
      )
    ).toEqual({
      currentEnergy: 40,
      updatedAt: 5000
    });
  });
});
