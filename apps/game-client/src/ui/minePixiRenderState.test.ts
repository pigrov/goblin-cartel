import { describe, expect, it } from "vitest";
import {
  createMinePixiBlockRenderSignature,
  createMinePixiVisibleCellKeySet,
  type MinePixiBlockRenderSnapshot
} from "./minePixiRenderState";

const block: MinePixiBlockRenderSnapshot = {
  blockTypeId: "stone",
  col: 1,
  destroyed: false,
  hp: 12,
  maxHp: 20,
  row: 2
};

describe("minePixiRenderState", () => {
  it("creates a stable signature for unchanged block render state", () => {
    const signature = createMinePixiBlockRenderSignature({
      active: false,
      block,
      blockTypeToken: "stone:",
      exposed: true,
      platformRow: false,
      size: 40,
      x: 100,
      y: 120
    });

    expect(createMinePixiBlockRenderSignature({
      active: false,
      block: { ...block },
      blockTypeToken: "stone:",
      exposed: true,
      platformRow: false,
      size: 40,
      x: 100,
      y: 120
    })).toBe(signature);
  });

  it("changes signature when visual block state changes", () => {
    const base = createMinePixiBlockRenderSignature({
      active: false,
      block,
      blockTypeToken: "stone:",
      exposed: true,
      platformRow: false,
      size: 40,
      x: 100,
      y: 120
    });

    expect(createMinePixiBlockRenderSignature({
      active: false,
      block: { ...block, hp: 8 },
      blockTypeToken: "stone:",
      exposed: true,
      platformRow: false,
      size: 40,
      x: 100,
      y: 120
    })).not.toBe(base);

    expect(createMinePixiBlockRenderSignature({
      active: true,
      block,
      blockTypeToken: "stone:",
      exposed: true,
      platformRow: false,
      size: 40,
      x: 100,
      y: 120
    })).not.toBe(base);

    expect(createMinePixiBlockRenderSignature({
      active: false,
      block,
      blockTypeToken: "stone:chest",
      exposed: true,
      platformRow: false,
      size: 40,
      x: 100,
      y: 120
    })).not.toBe(base);

    expect(createMinePixiBlockRenderSignature({
      active: false,
      block: { ...block, special: "vein", veinTypeId: "copper_vein_small" },
      blockTypeToken: "stone:",
      exposed: true,
      platformRow: false,
      size: 40,
      x: 100,
      y: 120
    })).not.toBe(base);
  });

  it("collects visible cell keys only from the requested row range", () => {
    const keys = createMinePixiVisibleCellKeySet([
      [{ row: 0, col: 0 }],
      [{ row: 1, col: 0 }, { row: 1, col: 1 }],
      [{ row: 2, col: 0 }]
    ], { startRow: 1, endRow: 2 });

    expect([...keys].sort()).toEqual(["1:0", "1:1", "2:0"]);
  });
});
