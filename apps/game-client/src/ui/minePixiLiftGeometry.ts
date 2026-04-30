import type { MinePixiLayout } from "./minePixiLayout";

const liftXOffset = -6;
const liftRailBottomInset = 18;

export function minePixiLiftX(layout: MinePixiLayout): number {
  return layout.gridX + liftXOffset;
}

export function minePixiLiftRailTop(layout: MinePixiLayout): number {
  return layout.surfaceHeight;
}

export function minePixiLiftRailHeight(layout: MinePixiLayout, platformOffset = 0): number {
  const railTop = minePixiLiftRailTop(layout);
  const railBottom = Math.max(railTop, layout.platformY + platformOffset + layout.platformHeight - liftRailBottomInset);

  return railBottom - railTop;
}
