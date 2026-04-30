import { describe, expect, it } from "vitest";
import {
  createMinePixiLayout,
  createVisibleRowRange,
  isRowInVisibleRange,
  minePixiLayoutConfig,
  pointToMineCell,
  pointToPlatformCell,
  pointToPlatformColumnCell
} from "./minePixiLayout";

const mine = {
  depthMeters: 60,
  height: 12,
  width: 8
};

describe("minePixiLayout", () => {
  it("creates a stable mobile layout for the mine scene", () => {
    const layout = createMinePixiLayout(mine, 430, 3);

    expect(layout.width).toBe(430);
    expect(layout.mineWidth).toBe(8);
    expect(layout.mineHeight).toBe(12);
    expect(layout.cellSize).toBeGreaterThanOrEqual(28);
    expect(layout.gridWidth).toBe(8 * layout.cellSize + 7 * layout.gap);
    expect(layout.platformY).toBe(layout.gridY + 3 * layout.rowStep - layout.platformHeight - minePixiLayoutConfig.platformGap);
  });

  it("clamps platform row inside the mine", () => {
    const layout = createMinePixiLayout(mine, 430, 999);

    expect(layout.platformY).toBe(layout.gridY + 11 * layout.rowStep - layout.platformHeight - minePixiLayoutConfig.platformGap);
  });

  it("keeps a visual gap between the platform and the top row block", () => {
    const layout = createMinePixiLayout(mine, 430, 0);

    expect(minePixiLayoutConfig.platformGap).toBe(2);
    expect(layout.gridY - (layout.platformY + layout.platformHeight)).toBe(minePixiLayoutConfig.platformGap);
  });

  it("maps points inside mine blocks to row and column", () => {
    const layout = createMinePixiLayout(mine, 430, 0);
    const point = {
      x: layout.gridX + 2 * layout.rowStep + layout.cellSize / 2,
      y: layout.gridY + 4 * layout.rowStep + layout.cellSize / 2
    };

    expect(pointToMineCell(point, layout)).toEqual({ row: 4, col: 2 });
  });

  it("rejects points in gaps or outside the mine grid", () => {
    const layout = createMinePixiLayout(mine, 430, 0);

    expect(pointToMineCell({ x: layout.gridX - 1, y: layout.gridY + 4 }, layout)).toBeNull();
    expect(pointToMineCell({ x: layout.gridX + layout.cellSize + 1, y: layout.gridY + 4 }, layout)).toBeNull();
    expect(pointToMineCell({ x: layout.gridX + layout.gridWidth + 1, y: layout.gridY + 4 }, layout)).toBeNull();
    expect(pointToMineCell({ x: layout.gridX + 4, y: layout.gridY + layout.gridHeight + 1 }, layout)).toBeNull();
  });

  it("maps platform drop points only to cells on the platform row", () => {
    const platformRow = 5;
    const layout = createMinePixiLayout(mine, 430, platformRow);
    const point = {
      x: layout.gridX + 6 * layout.rowStep + layout.cellSize / 2,
      y: layout.platformY + layout.platformHeight - 12
    };

    expect(pointToPlatformCell(point, layout, platformRow)).toEqual({ row: platformRow, col: 6 });
    expect(pointToPlatformCell({ x: layout.gridX + layout.gridWidth + 1, y: point.y }, layout, platformRow)).toBeNull();
    expect(pointToPlatformCell({ x: point.x, y: layout.platformY - 1 }, layout, platformRow)).toBeNull();
  });

  it("maps goblin drag drops by column regardless of vertical release position", () => {
    const platformRow = 5;
    const layout = createMinePixiLayout(mine, 430, platformRow);
    const x = layout.gridX + 3 * layout.rowStep + layout.cellSize / 2;

    expect(pointToPlatformColumnCell({ x, y: layout.platformY - layout.rowStep * 2 }, layout, platformRow)).toEqual({
      row: platformRow,
      col: 3
    });
    expect(pointToPlatformColumnCell({ x, y: layout.gridY + layout.rowStep * 10 }, layout, platformRow)).toEqual({
      row: platformRow,
      col: 3
    });
    expect(pointToPlatformColumnCell({ x: layout.gridX + layout.gridWidth + 1, y: layout.platformY }, layout, platformRow)).toBeNull();
  });

  it("creates an overscanned visible row range from scroll position", () => {
    const layout = createMinePixiLayout(mine, 430, 0);
    const range = createVisibleRowRange(layout, {
      height: layout.rowStep * 3,
      scrollTop: layout.gridY + layout.rowStep * 4
    });

    expect(range).toEqual({ startRow: 2, endRow: 9 });
    expect(isRowInVisibleRange(2, range)).toBe(true);
    expect(isRowInVisibleRange(9, range)).toBe(true);
    expect(isRowInVisibleRange(10, range)).toBe(false);
  });

  it("clamps visible row range at mine boundaries", () => {
    const layout = createMinePixiLayout(mine, 430, 0);

    expect(createVisibleRowRange(layout, { height: 120, scrollTop: 0 }, 3).startRow).toBe(0);
    expect(createVisibleRowRange(layout, { height: 120, scrollTop: layout.contentHeight + 500 }, 3).endRow).toBe(11);
  });

  it("keeps a bounded render window for a long debug mine", () => {
    const longMine = {
      ...mine,
      depthMeters: 250,
      height: 60
    };
    const layout = createMinePixiLayout(longMine, 430, 0);
    const range = createVisibleRowRange(layout, {
      height: 640,
      scrollTop: layout.gridY + layout.rowStep * 38
    });

    expect(layout.contentHeight).toBeGreaterThan(2400);
    expect(range.startRow).toBe(36);
    expect(range.endRow - range.startRow).toBeLessThanOrEqual(18);
  });
});
