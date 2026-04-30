import { describe, expect, it } from "vitest";
import {
  isNearBreakHpPercent,
  nearBreakIntensity,
  normalizeBlockHpPercent
} from "./minePixiBlockVisualState";

describe("mine Pixi block visual state", () => {
  it("normalizes block HP percent", () => {
    expect(normalizeBlockHpPercent(2, 20)).toBe(0.1);
    expect(normalizeBlockHpPercent(30, 20)).toBe(1);
    expect(normalizeBlockHpPercent(-5, 20)).toBe(0);
    expect(normalizeBlockHpPercent(5, 0)).toBe(1);
  });

  it("marks blocks near breaking at the configured threshold", () => {
    expect(isNearBreakHpPercent(0.22)).toBe(true);
    expect(isNearBreakHpPercent(0.23)).toBe(false);
  });

  it("increases warning intensity as HP gets closer to zero", () => {
    expect(nearBreakIntensity(0.22)).toBe(0);
    expect(nearBreakIntensity(0.11)).toBeCloseTo(0.5);
    expect(nearBreakIntensity(0)).toBe(1);
  });
});
