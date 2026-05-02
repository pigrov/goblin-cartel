import { describe, expect, it } from "vitest";
import {
  createElevatorProgressionState,
  getElevatorLevelConfig,
  normalizeElevatorLevel,
  upgradeElevator
} from "./elevatorState";

describe("elevator state", () => {
  it("normalizes unknown levels to the nearest configured level", () => {
    expect(normalizeElevatorLevel(undefined)).toBe(1);
    expect(normalizeElevatorLevel(0)).toBe(1);
    expect(normalizeElevatorLevel(3.7)).toBe(3);
    expect(normalizeElevatorLevel(99)).toBe(5);
  });

  it("exposes platform slots from current level", () => {
    expect(getElevatorLevelConfig(1).platformSlots).toBe(2);
    expect(getElevatorLevelConfig(3).platformSlots).toBe(4);
    expect(getElevatorLevelConfig(5).platformSlots).toBe(7);
  });

  it("checks upgrade costs and deducts resources", () => {
    const blocked = createElevatorProgressionState(1, { gold: 699, stone: 120 });

    expect(blocked.canUpgrade).toBe(false);
    expect(blocked.failureReason).toBe("not_enough_resources");

    const result = upgradeElevator({
      level: 1,
      resources: {
        gold: 800,
        stone: 130
      }
    });

    expect(result).toEqual({
      ok: true,
      level: 2,
      resources: {
        gold: 100,
        stone: 10
      }
    });
  });

  it("does not upgrade past the last level", () => {
    expect(upgradeElevator({ level: 5, resources: { gold: 100000 } })).toEqual({
      ok: false,
      reason: "max_level"
    });
  });
});
