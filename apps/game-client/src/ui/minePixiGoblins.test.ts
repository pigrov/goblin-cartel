import { describe, expect, it } from "vitest";
import { createGoblinGrabHitArea } from "./minePixiGoblins";

describe("minePixiGoblins", () => {
  it("keeps the goblin grab area the same screen size as a mine cell", () => {
    const cellSize = 44;
    const area = createGoblinGrabHitArea(cellSize);
    const scale = cellSize / 42;

    expect(Math.round(area.width * scale)).toBe(cellSize);
    expect(Math.round(area.height * scale)).toBe(cellSize);
  });
});
