import { describe, expect, it } from "vitest";
import { createMinePixiLayout, pointToMineCell, pointToPlatformCell } from "./minePixiLayout";

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
    expect(layout.platformY).toBe(layout.gridY + 3 * layout.rowStep - layout.platformHeight + 14);
  });

  it("clamps platform row inside the mine", () => {
    const layout = createMinePixiLayout(mine, 430, 999);

    expect(layout.platformY).toBe(layout.gridY + 11 * layout.rowStep - layout.platformHeight + 14);
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
});
