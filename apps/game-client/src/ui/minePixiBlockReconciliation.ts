import { Container } from "pixi.js";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningSession } from "@goblin-cartel/game-core";
import {
  cellKey,
  type MinePixiLayout,
  type MinePixiVisibleRowRange
} from "./minePixiLayout";
import {
  createMinePixiBlockRenderSignature,
  createMinePixiVisibleCellKeySet
} from "./minePixiRenderState";
import {
  blockTypeVisualToken,
  drawBlock
} from "./minePixiBlocks";
import {
  removeMinePixiRenderedNode,
  type MinePixiRenderedNode
} from "./minePixiRenderNodes";

export function reconcileMineBlocks(input: {
  activeCell: {
    row: number;
    col: number;
  };
  blockTypeById: ReadonlyMap<string, BlockTypeConfig>;
  currentPlatformRow: number;
  exposedCellKeys: ReadonlySet<string>;
  layout: MinePixiLayout;
  mineLayer: Container;
  renderedBlocks: Map<string, MinePixiRenderedNode>;
  sessionBlocks: MiningSession["blocks"];
  visibleRowRange: MinePixiVisibleRowRange;
}) {
  const visibleCellKeys = createMinePixiVisibleCellKeySet(input.sessionBlocks, input.visibleRowRange);

  for (const [key, renderedBlock] of input.renderedBlocks) {
    if (!visibleCellKeys.has(key)) {
      removeMinePixiRenderedNode(input.renderedBlocks, key, renderedBlock);
    }
  }

  for (let rowIndex = input.visibleRowRange.startRow; rowIndex <= input.visibleRowRange.endRow; rowIndex += 1) {
    const row = input.sessionBlocks[rowIndex];

    if (!row) {
      continue;
    }

    for (const block of row) {
      const blockKey = cellKey(block);
      const exposed = input.exposedCellKeys.has(blockKey);
      const active = block.row === input.activeCell.row && block.col === input.activeCell.col;
      const platformRow = block.row === input.currentPlatformRow;
      const x = input.layout.gridX + block.col * input.layout.rowStep;
      const y = input.layout.gridY + block.row * input.layout.rowStep;
      const blockType = input.blockTypeById.get(block.blockTypeId);
      const signature = createMinePixiBlockRenderSignature({
        active,
        block,
        blockTypeToken: blockTypeVisualToken(blockType),
        exposed,
        platformRow,
        size: input.layout.cellSize,
        x,
        y
      });
      const renderedBlock = input.renderedBlocks.get(blockKey);

      if (renderedBlock?.signature === signature) {
        continue;
      }

      if (renderedBlock) {
        removeMinePixiRenderedNode(input.renderedBlocks, blockKey, renderedBlock);
      }

      const blockGraphics = drawBlock(block, blockType, {
        active,
        exposed,
        platformRow,
        size: input.layout.cellSize
      });

      blockGraphics.position.set(x, y);

      if (!block.destroyed && exposed) {
        blockGraphics.cursor = "pointer";
      }

      input.mineLayer.addChild(blockGraphics);
      input.renderedBlocks.set(blockKey, {
        baseX: x,
        baseY: y,
        node: blockGraphics,
        signature
      });
    }
  }
}
