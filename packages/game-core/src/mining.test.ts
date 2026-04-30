import { describe, expect, it } from "vitest";
import { calculateBlockHp, calculateGoblinDps, calculateStoredProduction } from "./mining";

describe("mining formulas", () => {
  it("scales block hp only by the configured mine multiplier", () => {
    expect(calculateBlockHp({ baseHp: 100, rowIndex: 0, mineDifficultyMultiplier: 1 })).toBe(100);
    expect(calculateBlockHp({ baseHp: 100, rowIndex: 5, mineDifficultyMultiplier: 1 })).toBe(100);
    expect(calculateBlockHp({ baseHp: 100, rowIndex: 10, mineDifficultyMultiplier: 1.2 })).toBe(120);
  });

  it("calculates goblin dps with class, tool and tag bonuses", () => {
    expect(
      calculateGoblinDps({
        strength: 8,
        speed: 5,
        classMultiplier: 1.1,
        toolMultiplier: 1.25,
        blockTagBonus: 0.2
      })
    ).toBe(66);
  });

  it("caps stored production by mine capacity", () => {
    expect(
      calculateStoredProduction({
        productionPerMinute: 12,
        elapsedMinutes: 30,
        currentStored: 250,
        capacity: 300
      })
    ).toBe(300);
  });
});
