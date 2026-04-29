export interface MinePixiMineShape {
  depthMeters?: number;
  height: number;
  width: number;
}

export interface MinePixiLayout {
  cellSize: number;
  contentHeight: number;
  depthWidth: number;
  gap: number;
  gridHeight: number;
  gridWidth: number;
  gridX: number;
  gridY: number;
  mineHeight: number;
  mineWidth: number;
  platformHeight: number;
  platformWidth: number;
  platformY: number;
  rowStep: number;
  surfaceHeight: number;
  width: number;
}

export interface MinePixiPoint {
  x: number;
  y: number;
}

export interface MinePixiCell {
  row: number;
  col: number;
}

export interface MinePixiViewport {
  height: number;
  scrollTop: number;
}

export interface MinePixiVisibleRowRange {
  endRow: number;
  startRow: number;
}

export const minePixiLayoutConfig = {
  depthWidth: 34,
  gap: 4,
  minePaddingBottom: 16,
  minePaddingTop: 12,
  minSceneWidth: 320,
  platformGap: 2,
  platformHeight: 58,
  surfaceHeight: 132
} as const;

export function createMinePixiLayout(
  mine: MinePixiMineShape,
  viewportWidth: number,
  platformRow: number
): MinePixiLayout {
  const width = Math.max(minePixiLayoutConfig.minSceneWidth, viewportWidth);
  const mineWidth = Math.max(1, mine.width);
  const mineHeight = Math.max(1, mine.height);
  const gridX = 6 + minePixiLayoutConfig.depthWidth + minePixiLayoutConfig.gap;
  const usableGridWidth = width - gridX - 10;
  const cellSize = Math.max(28, Math.floor((usableGridWidth - minePixiLayoutConfig.gap * (mineWidth - 1)) / mineWidth));
  const rowStep = cellSize + minePixiLayoutConfig.gap;
  const gridY = minePixiLayoutConfig.surfaceHeight + minePixiLayoutConfig.minePaddingTop;
  const gridWidth = mineWidth * cellSize + Math.max(0, mineWidth - 1) * minePixiLayoutConfig.gap;
  const gridHeight = mineHeight * rowStep - minePixiLayoutConfig.gap;
  const normalizedPlatformRow = clampInteger(platformRow, 0, mineHeight - 1);
  const platformTop = gridY + normalizedPlatformRow * rowStep - minePixiLayoutConfig.platformHeight - minePixiLayoutConfig.platformGap;
  const platformY = Math.max(
    minePixiLayoutConfig.surfaceHeight - minePixiLayoutConfig.platformHeight + 4,
    platformTop
  );

  return {
    cellSize,
    contentHeight: gridY + gridHeight + minePixiLayoutConfig.minePaddingBottom,
    depthWidth: minePixiLayoutConfig.depthWidth,
    gap: minePixiLayoutConfig.gap,
    gridHeight,
    gridWidth,
    gridX,
    gridY,
    mineHeight,
    mineWidth,
    platformHeight: minePixiLayoutConfig.platformHeight,
    platformWidth: gridWidth,
    platformY,
    rowStep,
    surfaceHeight: minePixiLayoutConfig.surfaceHeight,
    width
  };
}

export function pointToPlatformCell(
  point: MinePixiPoint,
  layout: MinePixiLayout,
  platformRow: number
): MinePixiCell | null {
  const localY = point.y - layout.platformY;

  if (localY < 0 || localY > layout.platformHeight + layout.cellSize * 0.35) {
    return null;
  }

  const col = pointToColumn(point.x, layout);

  if (col === null) {
    return null;
  }

  return {
    row: clampInteger(platformRow, 0, layout.mineHeight - 1),
    col
  };
}

export function pointToMineCell(point: MinePixiPoint, layout: MinePixiLayout): MinePixiCell | null {
  const col = pointToColumn(point.x, layout);

  if (col === null || point.y < layout.gridY) {
    return null;
  }

  const relativeY = point.y - layout.gridY;
  const row = Math.floor(relativeY / layout.rowStep);
  const rowY = relativeY - row * layout.rowStep;

  if (!Number.isInteger(row) || row < 0 || row >= layout.mineHeight || rowY < 0 || rowY > layout.cellSize) {
    return null;
  }

  return { row, col };
}

export function createVisibleRowRange(
  layout: MinePixiLayout,
  viewport: MinePixiViewport,
  overscanRows = 2
): MinePixiVisibleRowRange {
  const visibleTop = Math.max(0, viewport.scrollTop - layout.gridY);
  const visibleBottom = Math.max(0, viewport.scrollTop + Math.max(0, viewport.height) - layout.gridY);
  const overscan = Math.max(0, Math.trunc(overscanRows));
  const startRow = clampInteger(Math.floor(visibleTop / layout.rowStep) - overscan, 0, layout.mineHeight - 1);
  const endRow = clampInteger(Math.floor(visibleBottom / layout.rowStep) + overscan, startRow, layout.mineHeight - 1);

  return { endRow, startRow };
}

export function isRowInVisibleRange(row: number, range: MinePixiVisibleRowRange): boolean {
  return row >= range.startRow && row <= range.endRow;
}

export function cellKey(cell: MinePixiCell): string {
  return `${cell.row}:${cell.col}`;
}

function pointToColumn(x: number, layout: MinePixiLayout): number | null {
  const relativeX = x - layout.gridX;
  const col = Math.floor(relativeX / layout.rowStep);
  const colX = relativeX - col * layout.rowStep;

  if (!Number.isInteger(col) || col < 0 || col >= layout.mineWidth || colX < 0 || colX > layout.cellSize) {
    return null;
  }

  return col;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.trunc(value)));
}
