import { Container, Graphics, Text, type FederatedPointerEvent } from "pixi.js";
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
  cableNodes?: Container[];
  dropEffects?: Container;
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
  status?: "idle" | "waiting" | "working";
  working: boolean;
}

export interface MinePixiColumnTacticHint {
  col: number;
  detail: string;
  hasTagBonus: boolean;
  label: string;
  row: number;
  state: "empty" | "weak" | "good" | "best";
}

export type MinePixiElevatorVisualStage = 1 | 2 | 3 | 4 | 5;

export function drawPlatform(input: {
  animatedGoblins: MinePixiAnimatedItem[];
  blocks: MiningSession["blocks"];
  columnHints: MinePixiColumnTacticHint[];
  currentPlatformRow: number;
  dragState: MinePixiDragState | null;
  elevatorVisualStage: MinePixiElevatorVisualStage;
  goblins: MinePixiPlatformGoblin[];
  layout: MinePixiLayout;
  mineWidth: number;
  platformCellKeys: ReadonlySet<string>;
  root: Container;
  setDragState: (state: MinePixiDragState | null) => void;
}): MinePixiAnimatedItem {
  const platform = new Container();
  platform.position.set(0, input.layout.platformY);
  const goblinByColumn = new Map(input.goblins.map((goblin) => [goblin.col, goblin]));
  const stage = normalizeElevatorVisualStage(input.elevatorVisualStage);
  const platformSkin = platformSkinByStage(stage);
  const cableNodes = drawPlatformCables(platform, input.layout, platformSkin);
  const dropEffects = drawPlatformDropEffects(platform, input.layout, platformSkin);

  platform.addChild(drawPlatformDeck(input.layout, stage, platformSkin));
  drawGoblinTargetHighlights(input);
  drawColumnTacticHints(input.root, input.layout, input.columnHints);

  for (let col = 0; col < input.mineWidth; col += 1) {
    const block = input.blocks[input.currentPlatformRow]?.[col];
    const slotX = input.layout.gridX + col * input.layout.rowStep;
    const canPlace = Boolean(block && !block.destroyed);
    const waitingGoblin = goblinByColumn.get(col)?.status === "waiting";
    const slot = new Graphics()
      .roundRect(slotX + 3, input.layout.platformHeight - 23, input.layout.cellSize - 6, 10, 4)
      .fill({
        color: waitingGoblin ? 0x5c3b1c : canPlace ? platformSkin.slot : 0x3b2a1b,
        alpha: canPlace || waitingGoblin ? 1 : 0.56
      });

    platform.addChild(slot);

    if (waitingGoblin) {
      platform.addChild(
        new Graphics()
          .circle(slotX + input.layout.cellSize / 2, input.layout.platformHeight - 18, 4)
          .fill({ color: 0xf2b84b, alpha: 0.98 })
          .rect(slotX + input.layout.cellSize / 2 - 0.8, input.layout.platformHeight - 21, 1.6, 4)
          .fill({ color: 0x3b2a1b })
          .circle(slotX + input.layout.cellSize / 2, input.layout.platformHeight - 15, 0.9)
          .fill({ color: 0x3b2a1b })
      );
    }
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
    const goblinNode = drawGoblin(input.layout.cellSize, goblin.working, false);
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
    const statusBadge = drawGoblinStatusBadge(goblin.status ?? (goblin.working ? "working" : "idle"));
    statusBadge.position.set(x, y - 11);
    platform.addChild(statusBadge);
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
    cableNodes,
    dropEffects,
    node: platform,
    phase: 0,
    working: false
  };
}

function drawColumnTacticHints(root: Container, layout: MinePixiLayout, hints: readonly MinePixiColumnTacticHint[]) {
  for (const hint of hints) {
    const x = layout.gridX + hint.col * layout.rowStep + layout.cellSize / 2;
    const y = layout.gridY + hint.row * layout.rowStep + 4;
    const colors = tacticHintColors(hint.state, hint.hasTagBonus);
    const hintNode = new Container();
    const label = new Text({
      style: {
        fill: colors.text,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 9,
        fontWeight: "900"
      },
      text: hint.label
    });
    const detail = new Text({
      style: {
        fill: colors.detail,
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 7,
        fontWeight: "800"
      },
      text: normalizeHintDetail(hint.detail)
    });
    const width = Math.max(30, Math.min(layout.cellSize - 2, Math.ceil(Math.max(label.width, detail.width)) + 10));
    const height = detail.text ? 22 : 16;

    hintNode.position.set(x - width / 2, y);
    label.anchor.set(0.5, 0);
    label.position.set(width / 2, 3);
    detail.anchor.set(0.5, 0);
    detail.position.set(width / 2, 13);
    hintNode.addChild(
      new Graphics()
        .roundRect(0, 0, width, height, 6)
        .fill({ color: colors.fill, alpha: 0.9 })
        .stroke({ color: colors.stroke, alpha: 0.96, width: hint.state === "weak" ? 1.7 : 1.2 })
    );
    hintNode.addChild(label);

    if (detail.text) {
      hintNode.addChild(detail);
    }

    if (hint.hasTagBonus) {
      hintNode.addChild(
        new Graphics()
          .circle(width - 4, 4, 3)
          .fill({ color: 0xf2b84b, alpha: 0.98 })
          .circle(width - 4, 4, 1.4)
          .fill({ color: 0x1b2715, alpha: 0.72 })
      );
    }

    root.addChild(hintNode);
  }
}

function drawPlatformDeck(layout: MinePixiLayout, stage: MinePixiElevatorVisualStage, skin: PlatformSkin): Graphics {
  const deck = new Graphics()
    .rect(layout.gridX - 2, 0, 3, layout.platformHeight - 8)
    .fill({ color: skin.rail, alpha: 0.95 })
    .rect(layout.gridX, layout.platformHeight - 19, layout.platformWidth, 13)
    .fill({ color: skin.deck })
    .stroke({ color: skin.stroke, width: stage >= 3 ? 1.6 : 1 })
    .rect(layout.gridX, layout.platformHeight - 7, layout.platformWidth, 6)
    .fill({ color: skin.trim });

  if (stage >= 2) {
    for (let x = layout.gridX + 10; x < layout.gridX + layout.platformWidth - 6; x += Math.max(16, layout.cellSize * 0.62)) {
      deck
        .rect(x, layout.platformHeight - 20, 4, 16)
        .fill({ color: skin.brace, alpha: 0.72 });
    }
  }

  if (stage >= 3) {
    deck
      .rect(layout.gridX + 2, layout.platformHeight - 24, layout.platformWidth - 4, 4)
      .fill({ color: skin.metal, alpha: 0.86 })
      .rect(layout.gridX + 2, layout.platformHeight - 2, layout.platformWidth - 4, 2)
      .fill({ color: skin.metal, alpha: 0.72 });
  }

  if (stage >= 4) {
    deck
      .circle(layout.gridX + 10, layout.platformHeight - 27, 4)
      .fill({ color: 0xffd56d, alpha: 0.92 })
      .circle(layout.gridX + layout.platformWidth - 10, layout.platformHeight - 27, 4)
      .fill({ color: 0xffd56d, alpha: 0.92 });
  }

  if (stage >= 5) {
    deck
      .rect(layout.gridX + 3, layout.platformHeight - 22, layout.platformWidth - 6, 2)
      .fill({ color: 0xf2b84b, alpha: 0.96 })
      .rect(layout.gridX + 3, layout.platformHeight - 5, layout.platformWidth - 6, 2)
      .fill({ color: 0xf2b84b, alpha: 0.88 });
  }

  return deck;
}

function tacticHintColors(
  state: MinePixiColumnTacticHint["state"],
  hasTagBonus: boolean
): { detail: number; fill: number; stroke: number; text: number } {
  if (state === "best") {
    return {
      detail: 0xdbffc9,
      fill: hasTagBonus ? 0x274117 : 0x1f351c,
      stroke: hasTagBonus ? 0xf2b84b : 0x91c86c,
      text: 0xf6fff0
    };
  }

  if (state === "good") {
    return { detail: 0xffefbf, fill: 0x413718, stroke: 0xf0d386, text: 0xfff8df };
  }

  if (state === "weak") {
    return { detail: 0xffd0b5, fill: 0x4a2018, stroke: 0xff8b5f, text: 0xfff1e7 };
  }

  return {
    detail: 0xd8f5ff,
    fill: hasTagBonus ? 0x29361c : 0x1c3143,
    stroke: hasTagBonus ? 0xf2b84b : 0x68c6c8,
    text: 0xffffff
  };
}

function normalizeHintDetail(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length <= 10) {
    return trimmed;
  }

  return `${trimmed.slice(0, 9)}.`;
}

function drawPlatformCables(platform: Container, layout: MinePixiLayout, skin: PlatformSkin): Container[] {
  const nodes = [
    createPlatformCable(layout.gridX + 8, layout.platformHeight, skin),
    createPlatformCable(layout.gridX + layout.platformWidth - 8, layout.platformHeight, skin)
  ];

  for (const node of nodes) {
    platform.addChild(node);
  }

  return nodes;
}

function createPlatformCable(x: number, platformHeight: number, skin: PlatformSkin): Container {
  const cable = new Container();
  cable.position.set(x, 0);
  cable.addChild(
    new Graphics()
      .rect(-1, 0, 2, platformHeight - 18)
      .fill({ color: skin.cable, alpha: 0.92 })
      .rect(2, 0, 1, platformHeight - 18)
      .fill({ color: 0xffffff, alpha: 0.15 })
  );
  return cable;
}

function drawPlatformDropEffects(platform: Container, layout: MinePixiLayout, skin: PlatformSkin): Container {
  const effects = new Container();
  effects.visible = false;
  effects.alpha = 0;
  effects.position.set(0, layout.platformHeight - 2);

  const dust = new Graphics();
  for (let x = layout.gridX + 8; x < layout.gridX + layout.platformWidth; x += Math.max(18, layout.cellSize * 0.75)) {
    const radius = 4 + (x % 3);
    dust.circle(x, 4 + (x % 5), radius).fill({ color: 0xcaa06a, alpha: 0.36 });
  }
  effects.addChild(dust);

  const sparks = new Graphics();
  for (let index = 0; index < 9; index += 1) {
    const x = layout.gridX + 5 + index * Math.max(18, layout.platformWidth / 9);
    const y = index % 2 === 0 ? -11 : -5;
    sparks
      .circle(x, y, 1.7)
      .fill({ color: skin.spark, alpha: 0.95 })
      .rect(x + 2, y - 0.5, 5, 1)
      .fill({ color: skin.spark, alpha: 0.46 });
  }
  effects.addChild(sparks);

  platform.addChild(effects);
  return effects;
}

function drawGoblinTargetHighlights(input: {
  blocks: MiningSession["blocks"];
  currentPlatformRow: number;
  goblins: MinePixiPlatformGoblin[];
  layout: MinePixiLayout;
  root: Container;
}) {
  const overlay = new Graphics();

  for (const goblin of input.goblins) {
    const targetBlock = input.blocks[input.currentPlatformRow]?.[goblin.col];

    if (!targetBlock || targetBlock.destroyed) {
      if (goblin.status === "waiting") {
        const x = input.layout.gridX + goblin.col * input.layout.rowStep;
        const y = input.layout.gridY + input.currentPlatformRow * input.layout.rowStep;
        overlay
          .rect(x + 2, y, input.layout.cellSize - 4, Math.max(input.layout.cellSize, input.layout.rowStep * 1.6))
          .fill({ color: 0xf2b84b, alpha: 0.07 })
          .roundRect(x + 3, y + 3, input.layout.cellSize - 6, input.layout.cellSize - 6, 5)
          .stroke({ color: 0xf2b84b, alpha: 0.48, width: 1.5 });
      }
      continue;
    }

    if (goblin.working) {
      const x = input.layout.gridX + goblin.col * input.layout.rowStep;
      const y = input.layout.gridY + input.currentPlatformRow * input.layout.rowStep;
      overlay
        .roundRect(x + 2, y + 2, input.layout.cellSize - 4, input.layout.cellSize - 4, 6)
        .fill({ color: 0x91c86c, alpha: 0.08 })
        .stroke({ color: 0xcaf7a9, alpha: 0.8, width: 2 });
    }
  }

  input.root.addChild(overlay);
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

  if (input.dragState.targetCell) {
    const targetX = input.layout.gridX + input.dragState.targetCell.col * input.layout.rowStep;
    input.root.addChild(
      new Graphics()
        .rect(targetX, input.layout.gridY, input.layout.cellSize, Math.max(0, input.layout.contentHeight - input.layout.gridY))
        .fill({ color: 0xf2b84b, alpha: 0.1 })
        .rect(targetX, input.layout.gridY, input.layout.cellSize, Math.max(0, input.layout.contentHeight - input.layout.gridY))
        .stroke({ color: 0xf2b84b, alpha: 0.46, width: 2 })
        .roundRect(targetX + 2, input.layout.platformY + input.layout.platformHeight - 27, input.layout.cellSize - 4, 16, 5)
        .fill({ color: 0xf2b84b, alpha: 0.18 })
        .stroke({ color: 0xf2b84b, alpha: 0.95, width: 3 })
    );
  }

  const preview = drawGoblin(input.layout.cellSize, sourceGoblin.working, true);
  preview.alpha = 0.94;
  preview.position.set(input.dragState.point.x, input.dragState.point.y - input.layout.platformHeight * 0.55);
  preview.scale.set(preview.scale.x * 1.16);
  input.root.addChild(preview);
}

function drawGoblinStatusBadge(status: "idle" | "waiting" | "working"): Container {
  const label = status === "working" ? "БЬЕТ" : status === "waiting" ? "НЕТ" : "ЖДЕТ";
  const colors = statusColors(status);
  const badge = new Container();
  const text = new Text({
    style: {
      fill: colors.text,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: 8,
      fontWeight: "800"
    },
    text: label
  });
  const width = Math.max(27, Math.ceil(text.width) + 10);

  text.anchor.set(0.5);
  text.position.set(0, -0.5);
  badge.addChild(
    new Graphics()
      .roundRect(-width / 2, -7, width, 14, 5)
      .fill({ color: colors.fill, alpha: 0.9 })
      .stroke({ color: colors.stroke, alpha: 0.95, width: 1 })
  );
  badge.addChild(text);
  return badge;
}

function statusColors(status: "idle" | "waiting" | "working"): { fill: number; stroke: number; text: number } {
  if (status === "working") {
    return { fill: 0x25351e, stroke: 0x91c86c, text: 0xcaf7a9 };
  }

  if (status === "waiting") {
    return { fill: 0x3b2a1b, stroke: 0xf2b84b, text: 0xffe0a0 };
  }

  return { fill: 0x1f3143, stroke: 0x68c6c8, text: 0xc9f6ff };
}

interface PlatformSkin {
  brace: number;
  cable: number;
  deck: number;
  metal: number;
  rail: number;
  slot: number;
  spark: number;
  stroke: number;
  trim: number;
}

function platformSkinByStage(stage: MinePixiElevatorVisualStage): PlatformSkin {
  switch (stage) {
    case 5:
      return {
        brace: 0xf2b84b,
        cable: 0xced6de,
        deck: 0x8d6a3f,
        metal: 0xf2b84b,
        rail: 0xc7d0d8,
        slot: 0xb98543,
        spark: 0xffef9a,
        stroke: 0x24160d,
        trim: 0x5a3b20
      };
    case 4:
      return {
        brace: 0x9aa6b3,
        cable: 0xb8c2cc,
        deck: 0x667887,
        metal: 0xaab4bd,
        rail: 0xaeb8c1,
        slot: 0x7d8690,
        spark: 0xffd56d,
        stroke: 0x1a2530,
        trim: 0x314253
      };
    case 3:
      return {
        brace: 0x8b929b,
        cable: 0x9ca3ad,
        deck: 0x737f8b,
        metal: 0xb5bec7,
        rail: 0x9ca3ad,
        slot: 0x878f98,
        spark: 0xffd06b,
        stroke: 0x25313b,
        trim: 0x39444d
      };
    case 2:
      return {
        brace: 0x8b929b,
        cable: 0x8f9aa3,
        deck: 0xa8753f,
        metal: 0x9ca3ad,
        rail: 0x9ca3ad,
        slot: 0xb17b45,
        spark: 0xf2b84b,
        stroke: 0x24160d,
        trim: 0x5e3d22
      };
    default:
      return {
        brace: 0x6a4728,
        cable: 0x7a5a3a,
        deck: 0x9b6a3a,
        metal: 0x9ca3ad,
        rail: 0x8a6138,
        slot: 0xa8753f,
        spark: 0xf2b84b,
        stroke: 0x24160d,
        trim: 0x55371f
      };
  }
}

function normalizeElevatorVisualStage(stage: MinePixiElevatorVisualStage): MinePixiElevatorVisualStage {
  if (!Number.isFinite(stage)) {
    return 1;
  }

  return Math.max(1, Math.min(5, Math.floor(stage))) as MinePixiElevatorVisualStage;
}
