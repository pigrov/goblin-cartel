import { describe, expect, it } from "vitest";
import { starterContentBundle } from "@goblin-cartel/content-schemas";
import {
  createElevatorProgressionState,
  getElevatorLevelConfig,
  normalizeElevatorLevel,
  upgradeElevator
} from "./elevatorState";

const elevator = starterContentBundle.elevator;

describe("elevator state", () => {
  it("normalizes unknown levels to the nearest configured level", () => {
    expect(normalizeElevatorLevel(elevator, undefined)).toBe(1);
    expect(normalizeElevatorLevel(elevator, 0)).toBe(1);
    expect(normalizeElevatorLevel(elevator, 3.7)).toBe(3);
    expect(normalizeElevatorLevel(elevator, 99)).toBe(5);
  });

  it("exposes platform slots from current level", () => {
    expect(getElevatorLevelConfig(elevator, 1).platformSlots).toBe(2);
    expect(getElevatorLevelConfig(elevator, 3).platformSlots).toBe(4);
    expect(getElevatorLevelConfig(elevator, 5).platformSlots).toBe(7);
  });

  it("exposes drop speed, offline damage and stability from current level", () => {
    const state = createElevatorProgressionState(elevator, 4, {});

    expect(state.dropDurationMs).toBe(1060);
    expect(state.offlineDamageMultiplier).toBe(1.16);
    expect(state.stabilityPercent).toBe(68);
  });

  it("checks upgrade costs and deducts resources", () => {
    const blocked = createElevatorProgressionState(elevator, 1, { gold: 699, stone: 120 });

    expect(blocked.canUpgrade).toBe(false);
    expect(blocked.failureReason).toBe("not_enough_resources");

    const result = upgradeElevator({
      elevator,
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
    expect(upgradeElevator({ elevator, level: 5, resources: { gold: 100000 } })).toEqual({
      ok: false,
      reason: "max_level"
    });
  });
});
