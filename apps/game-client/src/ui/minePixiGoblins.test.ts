import { describe, expect, it } from "vitest";
import { createGoblinGrabHitArea } from "./minePixiGoblins";

describe("mine Pixi goblins", () => {
  it("uses a wider grab area than the drawn goblin body", () => {
    const hitArea = createGoblinGrabHitArea(42);

    expect(hitArea.width).toBeGreaterThanOrEqual(46);
    expect(hitArea.height).toBeGreaterThanOrEqual(84);
    expect(hitArea.x).toBeLessThanOrEqual(-23);
    expect(hitArea.y).toBeLessThan(0);
  });

  it("keeps the grab area practical on compact cells", () => {
    const hitArea = createGoblinGrabHitArea(28);

    expect(hitArea.width).toBeGreaterThanOrEqual(46);
    expect(hitArea.height).toBeGreaterThanOrEqual(84);
  });
});
