import type { MinePixiVisibleRowRange } from "./minePixiLayout";
import { cellKey } from "./minePixiLayout";

export interface MinePixiRenderCell {
  col: number;
  row: number;
}

export interface MinePixiBlockRenderSnapshot {
  blockTypeId: string;
  col: number;
  destroyed: boolean;
  hp: number;
  maxHp: number;
  rewardChestTypeId?: string;
  row: number;
  special?: "reward_chest";
}

export interface MinePixiBlockRenderSignatureOptions {
  active: boolean;
  block: MinePixiBlockRenderSnapshot;
  blockTypeToken: string;
  exposed: boolean;
  platformRow: boolean;
  size: number;
  x: number;
  y: number;
}

export function createMinePixiBlockRenderSignature(options: MinePixiBlockRenderSignatureOptions): string {
  return [
    options.block.row,
    options.block.col,
    options.block.blockTypeId,
    options.blockTypeToken,
    options.block.destroyed ? 1 : 0,
    options.block.hp,
    options.block.maxHp,
    options.block.rewardChestTypeId ?? "",
    options.block.special ?? "",
    options.active ? 1 : 0,
    options.exposed ? 1 : 0,
    options.platformRow ? 1 : 0,
    options.size,
    options.x,
    options.y
  ].join("|");
}

export function createMinePixiVisibleCellKeySet(
  blockRows: readonly (readonly MinePixiRenderCell[])[],
  visibleRowRange: MinePixiVisibleRowRange
): Set<string> {
  const keys = new Set<string>();

  for (let rowIndex = visibleRowRange.startRow; rowIndex <= visibleRowRange.endRow; rowIndex += 1) {
    const row = blockRows[rowIndex];

    if (!row) {
      continue;
    }

    for (const cell of row) {
      keys.add(cellKey(cell));
    }
  }

  return keys;
}
