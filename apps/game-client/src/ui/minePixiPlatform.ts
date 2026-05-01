import { Container, Graphics, type FederatedPointerEvent } from "pixi.js";
import type { MiningSession } from "@goblin-cartel/game-core";
import {
  cellKey,
  pointToPlatformColumnCell,
  type MinePixiCell,
  type MinePixiLayout,
  type MinePixiPoint
} from "./minePixiLayout";
import { drawGoblin } from "./minePixiGoblins";

export interface MinePixiAnimatedItem {
  baseY: number;
  node: Container;
  phase: number;
  working: boolean;
}

export interface MinePixiDragState {
  goblinId: string;
  point: MinePixiPoint;
  targetCell: MinePixiCell | null;
}

export interface MinePixiPlatformGoblin {
  id: string;
  col: number;
  working: boolean;
}

export function drawPlatform(input: {
  animatedGoblins: MinePixiAnimatedItem[];
  blocks: MiningSession["blocks"];
  currentPlatformRow: number;
  dragState: MinePixiDragState | null;
  goblins: MinePixiPlatformGoblin[];
  layout: MinePixiLayout;
  mineWidth: number;
  platformCellKeys: ReadonlySet<string>;
  root: Container;
  setDragState: (state: MinePixiDragState | null) => void;
}): MinePixiAnimatedItem {
  const platform = new Container();
  platform.position.set(0, input.layout.platformY);

  const graphics = new Graphics()
    .rect(input.layout.gridX, input.layout.platformHeight - 18, input.layout.platformWidth, 13)
    .fill({ color: 0x9b6a3a })
    .stroke({ color: 0x24160d, width: 1 })
    .rect(input.layout.gridX, input.layout.platformHeight - 6, input.layout.platformWidth, 5)
    .fill({ color: 0x55371f })
    .rect(input.layout.gridX - 2, 0, 3, input.layout.platformHeight - 8)
    .fill({ color: 0x9ca3ad });

  platform.addChild(graphics);

  for (let col = 0; col < input.mineWidth; col += 1) {
    const block = input.blocks[input.currentPlatformRow]?.[col];
    const slotX = input.layout.gridX + col * input.layout.rowStep;
    const canPlace = Boolean(block && !block.destroyed);
    const slot = new Graphics()
      .roundRect(slotX + 3, input.layout.platformHeight - 23, input.layout.cellSize - 6, 10, 4)
      .fill({ color: canPlace ? 0xa8753f : 0x3b2a1b, alpha: canPlace ? 1 : 0.56 });

    platform.addChild(slot);
  }

  for (const goblin of input.goblins) {
    if (goblin.col < 0 || goblin.col >= input.mineWidth) {
      continue;
    }

    if (input.dragState?.goblinId === goblin.id) {
      continue;
    }

    const x = input.layout.gridX + goblin.col * input.layout.rowStep + input.layout.cellSize / 2;
    const y = input.layout.platformHeight - 40;
    const goblinNode = drawGoblin(input.layout.cellSize, goblin.working, false, { showGrabArea: true });
    goblinNode.position.set(x, y);
    goblinNode.eventMode = "static";
    goblinNode.cursor = "grab";
    goblinNode.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      event.preventDefault();
      const point = {
        x: event.global.x,
        y: event.global.y
      };
      const targetCell = pointToPlatformColumnCell(point, input.layout, input.currentPlatformRow);
      input.setDragState({
        goblinId: goblin.id,
        point,
        targetCell: targetCell && input.platformCellKeys.has(cellKey(targetCell)) ? targetCell : null
      });
    });

    platform.addChild(goblinNode);
    input.animatedGoblins.push({
      baseY: y,
      node: goblinNode,
      phase: goblin.col * 0.8,
      working: goblin.working
    });
  }

  input.root.addChild(platform);

  return {
    baseY: input.layout.platformY,
    node: platform,
    phase: 0,
    working: false
  };
}

export function drawDragPreview(input: {
  dragState: MinePixiDragState | null;
  goblins: MinePixiPlatformGoblin[];
  layout: MinePixiLayout;
  root: Container;
}) {
  if (!input.dragState) {
    return;
  }

  const sourceGoblin = input.goblins.find((goblin) => goblin.id === input.dragState?.goblinId);

  if (!sourceGoblin) {
    return;
  }

  const preview = drawGoblin(input.layout.cellSize, sourceGoblin.working, true);
  preview.alpha = 0.94;
  preview.position.set(input.dragState.point.x, input.dragState.point.y - input.layout.platformHeight * 0.55);
  preview.scale.set(preview.scale.x * 1.16);
  input.root.addChild(preview);

  if (input.dragState.targetCell) {
    const targetX = input.layout.gridX + input.dragState.targetCell.col * input.layout.rowStep;
    input.root.addChild(
      new Graphics()
        .roundRect(targetX + 2, input.layout.platformY + input.layout.platformHeight - 27, input.layout.cellSize - 4, 16, 5)
        .stroke({ color: 0xf2b84b, alpha: 0.95, width: 3 })
    );
  }
}
