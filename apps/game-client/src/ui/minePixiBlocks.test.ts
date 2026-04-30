import { describe, expect, it } from "vitest";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import { blockColor, blockTypeVisualToken } from "./minePixiBlocks";

describe("mine Pixi blocks", () => {
  it("maps known block types to stable colors", () => {
    expect(blockColor("stone", undefined)).toBe(0x62666d);
    expect(blockColor("copper_ore", undefined)).toBe(0xa35f38);
    expect(blockColor("iron_ore", undefined)).toBe(0x8f98a3);
    expect(blockColor("gold_ore", undefined)).toBe(0xd49a35);
    expect(blockColor("wooden_chest", undefined)).toBe(0xb77b35);
  });

  it("includes special behavior in render signature token", () => {
    const blockType = {
      id: "wooden_chest",
      specialBehavior: "chest"
    } as BlockTypeConfig;

    expect(blockTypeVisualToken(blockType)).toBe("wooden_chest:chest");
    expect(blockTypeVisualToken(undefined)).toBe("missing");
  });
});
