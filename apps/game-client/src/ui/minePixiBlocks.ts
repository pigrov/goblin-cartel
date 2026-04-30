import { Container, Graphics, Text } from "pixi.js";
import type { BlockTypeConfig } from "@goblin-cartel/content-schemas";
import type { MiningBlockState } from "@goblin-cartel/game-core";
import {
  isNearBreakHpPercent,
  nearBreakIntensity,
  normalizeBlockHpPercent
} from "./minePixiBlockVisualState";

export function drawBlock(
  block: MiningBlockState,
  blockType: BlockTypeConfig | undefined,
  options: {
    active: boolean;
    exposed: boolean;
    platformRow: boolean;
    size: number;
  }
): Container {
  const container = new Container();
  const size = options.size;
  const hpPercent = normalizeBlockHpPercent(block.hp, block.maxHp);
  const color = block.destroyed ? 0x15100c : blockColor(block.blockTypeId, blockType);
  const crackedAlpha = block.destroyed ? 0 : blockDamageAlpha(hpPercent);
  const nearBreak = !block.destroyed && isNearBreakHpPercent(hpPercent);

  container.addChild(
    new Graphics()
      .roundRect(0, 0, size, size, 5)
      .fill({ color })
      .stroke({ color: options.active ? 0xf2b84b : 0x0f0a07, alpha: options.active ? 0.95 : 0.55, width: options.active ? 2 : 1 })
  );

  if (!block.destroyed && options.platformRow) {
    container.addChild(
      new Graphics()
        .roundRect(2, 2, size - 4, size - 4, 4)
        .stroke({ color: 0xf2b84b, alpha: 0.3, width: 1 })
    );
  }

  if (!block.destroyed && options.exposed) {
    container.addChild(
      new Graphics()
        .rect(0, 0, size, 3)
        .fill({ color: 0x44c6c8, alpha: 0.52 })
    );
  }

  if (!block.destroyed && !options.exposed) {
    container.addChild(
      new Graphics()
        .roundRect(0, 0, size, size, 5)
        .fill({ color: 0x000000, alpha: 0.32 })
    );
  }

  if (crackedAlpha > 0) {
    container.addChild(drawCracks(size, crackedAlpha));
  }

  if (nearBreak) {
    container.addChild(drawNearBreakWarning(size, hpPercent));
  }

  if (!block.destroyed) {
    const hpText = createText({
      color: 0xf7ead8,
      fontSize: Math.max(9, Math.floor(size * 0.24)),
      fontWeight: "800",
      text: String(Math.ceil(block.hp))
    });
    hpText.position.set(5, 4);
    container.addChild(hpText);

    const labelText = createText({
      color: 0xffffff,
      fontSize: Math.max(8, Math.floor(size * 0.2)),
      fontWeight: "800",
      text: shortBlockLabel(blockType)
    });
    labelText.anchor.set(1, 1);
    labelText.alpha = 0.58;
    labelText.position.set(size - 4, size - 5);
    container.addChild(labelText);

    container.addChild(
      new Graphics()
        .roundRect(4, size - 7, Math.max(3, (size - 8) * hpPercent), 3, 2)
        .fill({ color: 0x6fbf57 })
    );
  }

  return container;
}

export function blockColor(blockTypeId: string, blockType: BlockTypeConfig | undefined): number {
  if (blockTypeId.includes("copper")) {
    return 0xa35f38;
  }

  if (blockTypeId.includes("gold")) {
    return 0xd49a35;
  }

  if (blockType?.specialBehavior === "chest" || blockTypeId.includes("chest")) {
    return 0xb77b35;
  }

  if (blockTypeId.includes("stone")) {
    return 0x62666d;
  }

  return 0x6a4a2e;
}

export function blockTypeVisualToken(blockType: BlockTypeConfig | undefined): string {
  return blockType ? `${blockType.id}:${blockType.specialBehavior ?? ""}` : "missing";
}

function drawNearBreakWarning(size: number, hpPercent: number): Container {
  const warning = new Container();
  const intensity = nearBreakIntensity(hpPercent);

  warning.addChild(
    new Graphics()
      .roundRect(2, 2, size - 4, size - 4, 4)
      .stroke({ color: 0xf2b84b, alpha: 0.38 + intensity * 0.28, width: 2 })
      .roundRect(5, 5, size - 10, size - 10, 3)
      .stroke({ color: 0xc4442d, alpha: 0.24 + intensity * 0.26, width: 1 })
  );

  warning.addChild(
    new Graphics()
      .moveTo(size * 0.18, size * 0.82)
      .lineTo(size * 0.42, size * 0.56)
      .lineTo(size * 0.34, size * 0.34)
      .moveTo(size * 0.58, size * 0.86)
      .lineTo(size * 0.52, size * 0.56)
      .lineTo(size * 0.78, size * 0.28)
      .stroke({ color: 0xf7ead8, alpha: 0.32 + intensity * 0.36, width: 2 })
  );

  warning.addChild(
    new Graphics()
      .circle(size * 0.82, size * 0.18, Math.max(2, size * 0.055))
      .fill({ color: 0xf2b84b, alpha: 0.56 + intensity * 0.28 })
      .circle(size * 0.18, size * 0.72, Math.max(1.5, size * 0.04))
      .fill({ color: 0xc4442d, alpha: 0.42 + intensity * 0.32 })
  );

  return warning;
}

function drawCracks(size: number, alpha: number): Graphics {
  return new Graphics()
    .moveTo(size * 0.28, size * 0.18)
    .lineTo(size * 0.46, size * 0.42)
    .lineTo(size * 0.38, size * 0.7)
    .moveTo(size * 0.62, size * 0.2)
    .lineTo(size * 0.52, size * 0.5)
    .lineTo(size * 0.74, size * 0.76)
    .stroke({ color: 0x0d0907, alpha, width: 2 });
}

function blockDamageAlpha(hpPercent: number): number {
  if (hpPercent <= 0.34) {
    return 0.78;
  }

  if (hpPercent <= 0.67) {
    return 0.52;
  }

  if (hpPercent < 1) {
    return 0.34;
  }

  return 0;
}

function shortBlockLabel(blockType?: BlockTypeConfig): string {
  if (!blockType) {
    return "?";
  }

  if (blockType.id === "copper_ore") {
    return "Cu";
  }

  if (blockType.specialBehavior === "chest") {
    return "Box";
  }

  return blockType.id.slice(0, 2).toUpperCase();
}

function createText(options: {
  color: number;
  fontSize: number;
  fontWeight: "700" | "800";
  text: string;
}): Text {
  return new Text({
    style: {
      fill: options.color,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: options.fontSize,
      fontWeight: options.fontWeight
    },
    text: options.text
  });
}
