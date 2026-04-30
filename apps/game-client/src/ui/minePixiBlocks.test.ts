import { describe, expect, it } from "vitest";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import { blockColor, blockTypeVisualToken } from "./minePixiBlocks";

describe("mine Pixi blocks", () => {
  it("maps known block types to stable colors", () => {
    expect(blockColor("stone", undefined)).toBe(0x62666d);
    expect(blockColor("copper_ore", undefined)).toBe(0xa35f38);
    expect(blockColor("iron_ore", undefined)).toBe(0x8f98a3);
    expect(blockColor("gold_ore", undefined)).toBe(0xd49a35);
    expect(blockColor("gold_cache", undefined)).toBe(0xd49a35);
  });

  it("includes special behavior in render signature token", () => {
    const blockType = {
      id: "blast_stone",
      specialBehavior: "explosion"
    } as BlockTypeConfig;

    expect(blockTypeVisualToken(blockType)).toBe("blast_stone:explosion");
    expect(blockTypeVisualToken(undefined)).toBe("missing");
  });
});
